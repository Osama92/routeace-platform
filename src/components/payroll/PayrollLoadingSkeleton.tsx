import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PayrollLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Period Selector Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary Card Skeleton */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-center p-3 bg-background rounded-lg">
                <Skeleton className="h-4 w-20 mx-auto mb-2" />
                <Skeleton className="h-8 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-28" />
        ))}
      </div>

      {/* Table Skeleton */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
            {/* Data Rows */}
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="grid grid-cols-8 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
                  <Skeleton key={col} className="h-12" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollLoadingSkeleton;
