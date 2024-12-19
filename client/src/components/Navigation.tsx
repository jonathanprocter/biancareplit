import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  
  const isLoggedIn = !["/", "/register"].includes(location);
  
  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <a className={`text-lg font-semibold ${location === "/dashboard" ? "text-primary" : "text-foreground hover:text-primary"}`}>
                Dashboard
              </a>
            </Link>
            <Link href="/progress">
              <a className={`text-lg font-semibold ${location === "/progress" ? "text-primary" : "text-foreground hover:text-primary"}`}>
                My Progress
              </a>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => {
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                window.location.href = "/";
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
