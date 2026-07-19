export default function ManagerLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-hairline" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-lg bg-hairline" />
        <div className="h-24 rounded-lg bg-hairline" />
        <div className="h-24 rounded-lg bg-hairline" />
      </div>
      <div className="h-64 rounded-lg bg-hairline" />
    </div>
  )
}
