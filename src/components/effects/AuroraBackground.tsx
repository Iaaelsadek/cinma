export const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/30 rounded-full blur-3xl animate-pulse mix-blend-screen filter opacity-50"></div>
      <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000 mix-blend-screen filter opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-cyan-500/30 rounded-full blur-3xl animate-pulse delay-2000 mix-blend-screen filter opacity-50"></div>
    </div>
  )
}
