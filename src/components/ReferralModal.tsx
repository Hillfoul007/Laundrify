import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Share2,
  MessageCircle,
  Gift,
  Users,
  Trophy,
  CheckCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

interface ReferralStats {
  asReferrer: {
    totalReferrals: number;
    completedReferrals: number;
    pendingRewards: number;
    totalRewardsEarned: number;
  };
  asReferee: {
    hasUsedReferral: boolean;
    referrerName?: string;
    status?: string;
  };
}

interface PendingReward {
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  completedAt: string;
  discountApplied: number;
}

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser?._id) {
      fetchReferralData();
    }
  }, [isOpen, currentUser]);

  const fetchReferralData = async () => {
    if (!currentUser?._id) return;

    setLoading(true);
    try {
      const response = await apiClient.getUserReferralInfo(currentUser._id);
      
      if (response.data) {
        setReferralCode(response.data.myReferralCode || "");
        setStats(response.data.stats || null);
        setPendingRewards(response.data.pendingRewards || []);
      }

      // If no referral code exists, generate one
      if (!response.data?.myReferralCode) {
        const generateResponse = await apiClient.generateReferralCode(currentUser._id);
        if (generateResponse.data?.referralCode) {
          setReferralCode(generateResponse.data.referralCode);
        }
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral information");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Referral code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (!referralCode) return;

    const message = `🎉 Hey! I'm using Laundrify for my laundry needs and thought you'd love it too!

💝 Use my referral code: ${referralCode}
🎁 Get 30% OFF your first order!

Download the app: ${window.location.origin}

Quick, clean & convenient! 🧺✨`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const shareViaSMS = () => {
    if (!referralCode) return;

    const message = `Hey! Use my Laundrify referral code ${referralCode} and get 30% OFF your first order! ${window.location.origin}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl);
  };

  const shareGeneral = async () => {
    if (!referralCode) return;

    const shareData = {
      title: "Laundrify Referral",
      text: `Use my referral code ${referralCode} and get 30% OFF your first laundry order!`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback - copy to clipboard
        const shareText = `${shareData.text} ${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        toast.success("Share link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-laundrify-purple"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-6 w-6 text-laundrify-purple" />
            Refer & Earn
          </DialogTitle>
          <DialogDescription>
            Share Laundrify with friends and earn rewards!
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Share & Earn</TabsTrigger>
            <TabsTrigger value="stats">My Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-6">
            {/* How it Works */}
            <Card className="border-laundrify-purple/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-laundrify-purple" />
                  How it Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-laundrify-purple text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Share your code</p>
                    <p className="text-sm text-gray-600">
                      Send your referral code to friends
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-laundrify-pink text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">They get 30% off</p>
                    <p className="text-sm text-gray-600">
                      Your friend gets 30% off their first order
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-laundrify-mint text-gray-800 rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">You get 50% off</p>
                    <p className="text-sm text-gray-600">
                      When their order completes, you get 50% off coupon!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Code Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Referral Code</CardTitle>
                <CardDescription>
                  Share this code with friends to start earning rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referral-code">Referral Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral-code"
                      value={referralCode}
                      readOnly
                      className="font-mono text-lg font-bold bg-gray-50"
                    />
                    <Button
                      onClick={copyReferralCode}
                      variant={copied ? "default" : "outline"}
                      className={copied ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    onClick={shareViaWhatsApp}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button onClick={shareViaSMS} variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                  <Button onClick={shareGeneral} variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 text-laundrify-purple mx-auto mb-2" />
                      <p className="text-2xl font-bold">{stats.asReferrer.totalReferrals}</p>
                      <p className="text-sm text-gray-600">Total Referrals</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">{stats.asReferrer.completedReferrals}</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">{stats.asReferrer.pendingRewards}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">{stats.asReferrer.totalRewardsEarned}</p>
                      <p className="text-sm text-gray-600">Rewards Earned</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Referred By Info */}
                {stats.asReferee.hasUsedReferral && (
                  <Card className="border-laundrify-mint/50 bg-laundrify-mint/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-5 w-5 text-laundrify-pink" />
                        <p className="font-medium">You were referred by</p>
                      </div>
                      <p className="text-lg font-bold text-laundrify-purple">
                        {stats.asReferee.referrerName}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        Status: {stats.asReferee.status}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Rewards */}
                {pendingRewards.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Referrals</CardTitle>
                      <CardDescription>
                        Friends who completed their first order
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingRewards.map((reward, index) => (
                          <div
                            key={reward.refereeId}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{reward.refereeName}</p>
                              <p className="text-sm text-gray-600">
                                Completed on {formatDate(reward.completedAt)}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              ₹{reward.discountApplied} saved
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {stats.asReferrer.totalReferrals === 0 && (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">No referrals yet</p>
                      <p className="text-gray-600 mb-4">
                        Start sharing your referral code to earn rewards!
                      </p>
                      <Button
                        onClick={() => {
                          // Switch to share tab
                          const shareTab = document.querySelector('[value="share"]') as HTMLElement;
                          shareTab?.click();
                        }}
                        className="bg-laundrify-purple hover:bg-laundrify-purple/90"
                      >
                        Share Now
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralModal;
