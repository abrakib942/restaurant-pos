import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-9 w-56 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-none">
            <CardHeader className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="mt-3 h-3 w-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader>
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-3 w-56 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <div className="h-6 w-28 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
