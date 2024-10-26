export function BubbleBox() {
  return (
    <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-[5] bg-red-300">
      <Bubble className="bg-slate-100/40 h-[600px] w-[600px] top-[-800px] right-[-900px] blur-sm" />
      <Bubble className="bg-slate-100/30 h-[900px] w-[900px] top-[200px] right-[300px] blur-sm" />
      <Bubble className="bg-slate-100/20 h-[500px] w-[500px] top-[0px] right-[300px]" />
      <Bubble className="bg-slate-100/40 h-[300px] w-[300px] top-[0px] right-[-400px]" />
      <Bubble className="bg-slate-100/50 h-[150px] w-[150px] top-[-100px] right-[100px] blur-md " />
      <Bubble className="bg-slate-100/10 h-[2000px] w-[2000px] top-[-200px] right-[-1800px] blur-sm" />
      <Bubble className="bg-slate-100/10 h-[1800px] w-[1800px] top-[-2000px] right-[-400px] blur-sm" />
      <Bubble className="bg-slate-100 h-[200px] w-[200px] top-[100px] right-[50px] blur-sm" />
      <Bubble className="bg-slate-100 h-[200px] w-[200px] top-[-400px] right-[-400px] blur-sm" />
      <Bubble className="bg-slate-100 h-[170px] w-[170px] top-[-300px] right-[400px] blur-sm" />
      <Bubble className="bg-slate-100 h-[200px] w-[200px] top-[400px] right-[400px] blur-sm" />
    </div>
  );
}

const Bubble = ({ className }: { className?: string }) => {
  className ??= "";
  return <div className={`absolute rounded-full  ${className}`} />;
};
