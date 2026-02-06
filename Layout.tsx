
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, actions }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-xl relative">
      <header className="prociv-blue text-white p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-black tracking-tight uppercase">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
            {actions}
        </div>
      </header>
      
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {children}
      </main>

      <footer className="prociv-yellow p-2 text-center text-[10px] font-black text-blue-900 absolute bottom-0 w-full border-t border-yellow-500 uppercase tracking-widest">
        Protezione Civile - Gestione Mezzi
      </footer>
    </div>
  );
};

export default Layout;
