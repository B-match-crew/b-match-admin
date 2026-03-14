"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchAds } from "../api/ad-api";
import { useAdStore } from "../model/ad-store";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { AD_TYPE, DEFAULT_PAGE_SIZE } from "@/src/shared/config/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PinAdTable() {
  const supabase = useSupabase();
  const { ads, total, page, isLoading, setAds, setPage, setIsLoading } =
    useAdStore();

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setIsLoading(true);
    fetchAds(supabase, {
      type: AD_TYPE.PIN,
      page,
      limit: DEFAULT_PAGE_SIZE,
    })
      .then(({ data, total }) => setAds(data, total))
      .finally(() => setIsLoading(false));
  }, [supabase, page, setAds, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  if (ads.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState description="등록된 지도 핀 광고가 없습니다" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체명</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>좌표</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell className="font-medium">
                  {ad.advertiser_id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ad.landing_url ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  -
                </TableCell>
                <TableCell>
                  <StatusBadge status={ad.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
