"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchAds, updateAdStatus } from "../api/ad-api";
import { useAdStore } from "../model/ad-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDate } from "@/src/shared/lib/format-date";
import { AD_STATUS } from "@/src/shared/config/constants";
import { Check, X, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import type { Advertisement } from "@/src/entities/advertisement/types";

export function AdReviewPanel() {
  const supabase = useSupabase();
  const { ads, isLoading, setAds, setIsLoading, updateAd } = useAdStore();
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchAds(supabase, {
      status: AD_STATUS.PENDING,
      page: 1,
      limit: 100,
    })
      .then(({ data, total }) => {
        setAds(data, total);
        if (data.length > 0 && !selectedAd) {
          setSelectedAd(data[0]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [supabase, setAds, setIsLoading]);

  async function handleApprove() {
    if (!selectedAd) return;
    setIsProcessing(true);
    try {
      const updated = await updateAdStatus(
        supabase,
        selectedAd.id,
        AD_STATUS.APPROVED
      );
      updateAd(updated);
      setSelectedAd(null);
      toast.success("광고가 승인되었습니다");
    } catch {
      toast.error("승인 처리에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedAd || !rejectionReason.trim()) {
      toast.error("반려 사유를 입력해주세요");
      return;
    }
    setIsProcessing(true);
    try {
      const updated = await updateAdStatus(
        supabase,
        selectedAd.id,
        AD_STATUS.REJECTED,
        rejectionReason
      );
      updateAd(updated);
      setSelectedAd(null);
      setRejectionReason("");
      setShowRejectForm(false);
      toast.success("광고가 반려되었습니다");
    } catch {
      toast.error("반려 처리에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  const pendingAds = ads.filter((ad) => ad.status === AD_STATUS.PENDING);

  if (pendingAds.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="검수 대기 중인 광고가 없습니다"
            description="모든 광고가 검수 완료되었습니다"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">
            검수 대기 ({pendingAds.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingAds.map((ad) => (
            <button
              key={ad.id}
              onClick={() => {
                setSelectedAd(ad);
                setShowRejectForm(false);
                setRejectionReason("");
              }}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedAd?.id === ad.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="truncate text-sm font-medium">{ad.advertiser_id}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ad.type} | {formatDate(ad.start_date)} ~{" "}
                {formatDate(ad.end_date)}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">광고 상세</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAd ? (
            <div className="space-y-4">
              {selectedAd.image_url && (
                <div className="overflow-hidden rounded-lg border">
                  <img
                    src={selectedAd.image_url}
                    alt="광고 이미지"
                    className="w-full object-contain"
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="광고주" value={selectedAd.advertiser_id} />
                <DetailItem label="유형" value={selectedAd.type} />
                <DetailItem
                  label="기간"
                  value={`${formatDate(selectedAd.start_date)} ~ ${formatDate(selectedAd.end_date)}`}
                />
                <DetailItem
                  label="노출 순서"
                  value={String(selectedAd.display_order)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">상태:</span>
                  <StatusBadge status={selectedAd.status} />
                </div>
                {selectedAd.landing_url && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      랜딩 URL:
                    </span>
                    <a
                      href={selectedAd.landing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      바로가기
                    </a>
                  </div>
                )}
              </div>

              {showRejectForm && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    반려 사유
                  </label>
                  <Textarea
                    placeholder="반려 사유를 입력하세요"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  승인
                </Button>
                {showRejectForm ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isProcessing || !rejectionReason.trim()}
                    >
                      반려 확인
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isProcessing}
                  >
                    <X className="mr-2 h-4 w-4" />
                    반려
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState description="검수할 광고를 선택해주세요" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="ml-2 text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
