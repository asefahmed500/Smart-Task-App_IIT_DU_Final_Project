export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-36 rounded bg-hairline" />
      <div className="flex gap-8">
        <div className="h-24 w-24 rounded-full bg-hairline" />
        <div className="flex-1 space-y-4">
          <div className="h-10 rounded bg-hairline" />
          <div className="h-10 rounded bg-hairline" />
          <div className="h-10 rounded bg-hairline" />
        </div>
      </div>
    </div>
  )
}
