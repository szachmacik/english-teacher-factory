import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import {
  Download, ExternalLink, ShoppingBag, Star, Copy, Check,
  FileText, Gamepad2, BookOpen, Layers, ArrowLeft, Loader2,
  Tag, Globe, Package, Sparkles, ChevronRight, Share2
} from "lucide-react";

const PLATFORM_CONFIGS = [
  {
    id: "etsy",
    name: "Etsy",
    icon: "🛍️",
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-50 border-orange-200",
    description: "Best for printable worksheets & flashcard sets",
    avgPrice: "$4.99–$7.99",
    fee: "6.5% transaction fee",
    url: "https://www.etsy.com/sell",
  },
  {
    id: "tpt",
    name: "Teachers Pay Teachers",
    icon: "🍎",
    color: "from-green-500 to-green-600",
    bg: "bg-green-50 border-green-200",
    description: "Largest marketplace for teacher resources",
    avgPrice: "$3.00–$6.00",
    fee: "45% commission (free) / 20% (premium)",
    url: "https://www.teacherspayteachers.com/Sell-on-TpT",
  },
  {
    id: "gumroad",
    name: "Gumroad",
    icon: "🌸",
    color: "from-pink-500 to-pink-600",
    bg: "bg-pink-50 border-pink-200",
    description: "Great for digital bundles & subscriptions",
    avgPrice: "$5.00–$15.00",
    fee: "10% flat fee",
    url: "https://gumroad.com",
  },
  {
    id: "payhip",
    name: "Payhip",
    icon: "💜",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 border-purple-200",
    description: "Zero monthly fees, instant payouts",
    avgPrice: "$4.99–$9.99",
    fee: "5% transaction fee",
    url: "https://payhip.com",
  },
];

export default function Marketplace() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

    const { data: projectData, isLoading } = trpc.factory.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );
  const project = projectData?.project;
  const products = projectData?.products;
  const gameList = projectData?.games;


  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadBundle = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download/bundle/${projectId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ? decodeURIComponent(match[1]) : "EduBundle.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Bundle downloaded!", { description: "ZIP file saved to your downloads folder." });
    } catch (err) {
      toast.error("Download failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const productCount = products?.length || 0;
  const gameCount = gameList?.length || 0;
  const title = project?.title || "English Teaching Pack";
  const level = project?.cefrLevel || "B1";

  const etsyTitle = `${title} | Complete ${level} English Lesson Pack | ESL Worksheets + Games + Lesson Plan | Instant Download`;
  const etsyDescription = `⭐ SAVE HOURS OF LESSON PLANNING! ⭐

This complete ${level} English teaching pack includes everything you need for a full lesson on "${title}".

✅ WHAT'S INCLUDED:
${products?.slice(0, 10).map((p: { title?: string | null; type: string }) => `• ${p.title || p.type}`).join("\n") || "• Worksheet\n• Vocabulary List\n• Flashcards\n• Lesson Plan\n• Grammar Guide"}
• ${gameCount} Interactive Online Games (shareable links for students)

📥 INSTANT DOWNLOAD — PDF format, print-ready A4
🎯 LEVEL: ${level} | TOPIC: ${title}

Perfect for:
→ Private English tutors
→ Language school teachers
→ Online English teachers
→ Primary & secondary school EFL teachers

TAGS: esl worksheet, english lesson plan, ${level.toLowerCase()} english, teaching resources, efl materials, printable flashcards, vocabulary activities, english games, lesson pack, instant download`;

  const tptTitle = `${title} | ${level} ESL Complete Lesson Bundle | Worksheets, Games, Lesson Plan`;
  const tptDescription = `Save time and engage your students with this complete ${level} English lesson bundle based on "${title}".

This resource includes ${productCount}+ ready-to-use materials:
${products?.slice(0, 8).map((p: { title?: string | null; type: string }) => `★ ${p.title || p.type}`).join("\n") || "★ Worksheet\n★ Vocabulary List\n★ Flashcards\n★ Lesson Plan"}
★ ${gameCount} Interactive Digital Games (quiz, memory, matching, fill-blanks, spelling, scramble)

GRADE LEVELS: 6-12, Adult Education
SUBJECT: English Language Arts, EFL/ESL
RESOURCE TYPE: Lesson, Activities, Printables, Digital
STANDARDS: CEFR ${level}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Project
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Marketplace Kit</span>
            </div>
          </div>
          <Button onClick={downloadBundle} disabled={isDownloading} className="gap-2">
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Bundle (.zip)
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border border-primary/20 rounded-2xl p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">CEFR {level}</Badge>
                <Badge variant="outline">{productCount} Products</Badge>
                <Badge variant="outline">{gameCount} Games</Badge>
                <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> AI-Generated</Badge>
              </div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground">Complete teaching ecosystem ready to sell on digital marketplaces</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)} className="gap-1.5">
                <BookOpen className="w-4 h-4" /> View Products
              </Button>
              <Button size="sm" onClick={downloadBundle} disabled={isDownloading} className="gap-1.5">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Download ZIP
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Products included", value: productCount, icon: FileText, color: "text-blue-500" },
              { label: "Interactive games", value: gameCount, icon: Gamepad2, color: "text-purple-500" },
              { label: "Suggested price", value: "$5.99", icon: Tag, color: "text-green-500" },
              { label: "Platforms", value: "4", icon: Globe, color: "text-orange-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/60 rounded-xl p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Sell On These Platforms
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORM_CONFIGS.map((platform) => (
              <Card key={platform.id} className={`border ${platform.bg} hover:shadow-md transition-shadow`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{platform.icon}</span>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">{platform.avgPrice}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                  <p className="text-xs text-muted-foreground">Fee: {platform.fee}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => window.open(platform.url, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open {platform.name}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Etsy Listing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🛍️</span> Etsy Listing
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(`${etsyTitle}\n\n${etsyDescription}`, "etsy")}
                className="gap-1.5"
              >
                {copied === "etsy" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
                <button onClick={() => copyText(etsyTitle, "etsy-title")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  {copied === "etsy-title" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm font-medium">{etsyTitle}</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                <button onClick={() => copyText(etsyDescription, "etsy-desc")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  {copied === "etsy-desc" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-xs max-h-64 overflow-y-auto">{etsyDescription}</div>
            </div>
          </CardContent>
        </Card>

        {/* TPT Listing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🍎</span> Teachers Pay Teachers
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(`${tptTitle}\n\n${tptDescription}`, "tpt")}
                className="gap-1.5"
              >
                {copied === "tpt" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
                <button onClick={() => copyText(tptTitle, "tpt-title")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  {copied === "tpt-title" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm font-medium">{tptTitle}</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                <button onClick={() => copyText(tptDescription, "tpt-desc")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  {copied === "tpt-desc" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-xs max-h-64 overflow-y-auto">{tptDescription}</div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Pricing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { tier: "Single Pack", price: "$4.99–$7.99", desc: "One topic, all materials", recommended: false },
                { tier: "Bundle (5 packs)", price: "$19.99–$24.99", desc: "5 related topics together", recommended: true },
                { tier: "Subscription", price: "$9.99/month", desc: "New pack every week", recommended: false },
              ].map(({ tier, price, desc, recommended }) => (
                <div key={tier} className={`rounded-xl p-4 border-2 ${recommended ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
                  {recommended && <Badge className="mb-2 text-xs">Recommended</Badge>}
                  <div className="font-bold text-lg">{price}</div>
                  <div className="font-medium text-sm">{tier}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Share Games */}
        {gameList && gameList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Shareable Game Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Include these links in your product listing — students can play without logging in!
              </p>
              <div className="space-y-2">
                {gameList.map((game) => {
                  const gameUrl = game.shareToken ? `${window.location.origin}/game/${game.shareToken}` : null;
                  return (
                    <div key={game.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <Gamepad2 className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium capitalize">{game.type?.replace(/_/g, " ")}</div>
                        {gameUrl && <div className="text-xs text-muted-foreground truncate">{gameUrl}</div>}
                      </div>
                      {gameUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyText(gameUrl, `game-${game.id}`)}
                          className="shrink-0"
                        >
                          {copied === `game-${game.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download CTA */}
        <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-8 text-white text-center">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-bold mb-2">Ready to Sell?</h2>
          <p className="opacity-90 mb-6">Download your complete bundle — all products, vocabulary, game links, and marketplace listings in one ZIP file.</p>
          <Button
            size="lg"
            variant="secondary"
            onClick={downloadBundle}
            disabled={isDownloading}
            className="gap-2 text-primary font-bold"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download Complete Bundle (.zip)
          </Button>
          <p className="text-xs opacity-70 mt-3">Includes: {productCount} products · {gameCount} game links · Etsy & TPT listings · Vocabulary CSV · Anki deck</p>
        </div>
      </main>
    </div>
  );
}
