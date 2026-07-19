export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        <span className="text-sm text-muted-text">Loading...</span>
      </div>
    </div>
  )
}
