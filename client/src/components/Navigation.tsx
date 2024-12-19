import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const publicRoutes = ["/", "/register"];
  
  if (publicRoutes.includes(location)) {
    return null;
  }

  const linkClass = (path: string) =>
    `text-lg font-semibold ${
      location === path 
        ? "text-primary" 
        : "text-foreground hover:text-primary"
    }`;

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = "/";
  };

  return (
    <nav className="bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <span className={linkClass("/dashboard")}>
                Dashboard
              </span>
            </Link>
            <Link href="/progress">
              <span className={linkClass("/progress")}>
                My Progress
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
