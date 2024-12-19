import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, courses, modules, enrollments, extendedInsertUserSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { hash, compare } from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";

export function registerRoutes(app: Express): Server {
  const memoryStore = MemoryStore(session);
  
  app.use(session({
    secret: process.env.FLASK_SECRET_KEY || 'development_secret',
    resave: false,
    saveUninitialized: false,
    store: new memoryStore({
      checkPeriod: 86400000
    })
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = extendedInsertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, userData.username)
      });
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, userData.email)
      });
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 10);
      
      // Create user
      const [user] = await db.insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      // Auto login after registration
      req.session.userId = user.id;
      res.status(201).json(user);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, username)
      });
      
      if (!user || !(await compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Course routes
  app.get("/api/courses", requireAuth, async (req, res) => {
    try {
      const allCourses = await db.query.courses.findMany({
        with: {
          instructor: true,
          modules: true
        }
      });
      res.json(allCourses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", requireAuth, async (req, res) => {
    try {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, parseInt(req.params.id)),
        with: {
          instructor: true,
          modules: true
        }
      });
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Enrollment routes
  app.post("/api/enrollments", requireAuth, async (req, res) => {
    const { courseId } = req.body;
    const userId = req.session.userId;

    try {
      const existing = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId)
        )
      });

      if (existing) {
        return res.status(400).json({ message: "Already enrolled" });
      }

      const enrollment = await db.insert(enrollments).values({
        userId,
        courseId,
      }).returning();

      res.json(enrollment[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to enroll" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
