import React from 'react';

const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-500/20 blur-[120px] animate-pulse" />
      <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-slate-400/15 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-slate-600/10 blur-[110px] animate-pulse" style={{ animationDelay: '4s' }} />
    </div>
  );
};

export default Background;
