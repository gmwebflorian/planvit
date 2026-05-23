export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-background">
      <main className="flex flex-col items-center gap-6 text-center px-4">
        <h1 className="text-5xl font-bold tracking-tight text-text-primary">
          Plan<span className="text-accent-orange">VIT</span>
        </h1>
        <p className="text-xl text-text-secondary">Coming soon</p>
        <div className="w-16 h-1 rounded-full bg-accent-orange mt-2" />
      </main>
    </div>
  );
}
