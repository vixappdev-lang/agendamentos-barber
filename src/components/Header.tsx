import { Scissors } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight text-foreground">
              BarberShop
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Premium Grooming</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
