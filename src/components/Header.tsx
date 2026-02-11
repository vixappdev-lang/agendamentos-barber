import { Scissors } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full sticky top-0 z-50" style={{
      background: 'hsl(0 0% 100% / 0.03)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid hsl(0 0% 100% / 0.06)',
    }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 20px hsl(0 0% 100% / 0.1)' }}>
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              SuaBarbearia
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase -mt-0.5">Premium Grooming</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
