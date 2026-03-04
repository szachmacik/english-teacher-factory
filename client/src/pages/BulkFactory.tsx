import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Play, CheckCircle2, XCircle, Clock,
  Youtube, Globe, FileText, Mic, Music, Brain, ArrowLeft,
  Layers, BarChart3, Package
} from "lucide-react";
import { getLoginUrl } from "@/const";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  url: <Globe className="w-4 h-4 text-blue-500" />,
  text: <FileText className="w-4 h-4 text-green-500" />,
  ai_topic: <Brain className="w-4 h-4 text-purple-500" />,
  voice_note: <Mic className="w-4 h-4 text-orange-500" />,
  song: <Music className="w-4 h-4 text-pink-500" />,
};

const SOURCE_PLACEHOLDERS: Record<string, string> = {
  youtube: "https://www.youtube.com/watch?v=...",
  url: "https://www.bbc.co.uk/learningenglish/...",
  text: "Paste your text here...",
  ai_topic: "e.g. Present Perfect B2, Business Emails C1",
  voice_note: "https://s3.../audio.webm (upload URL)",
  song: "https://www.youtube.com/watch?v=... (music video)",
};

const PRODUCT_OPTIONS = [
  { value: "worksheet", label: "Worksheet" },
  { value: "vocabulary_list", label: "Vocabulary List" },
  { value: "flashcards", label: "Flashcards" },
  { value: "grammar_guide", label: "Grammar Guide" },
  { value: "writing_exercise", label: "Writing Exercise" },
  { value: "listening_comprehension", label: "Listening Task" },
  { value: "lesson_plan", label: "Lesson Plan" },
  { value: "mini_textbook", label: "Mini Textbook" },
  { value: "discussion_questions", label: "Discussion Questions" },
  { value: "homework", label: "Homework" },
  { value: "teacher_notes", label: "Teacher Notes" },
  { value: "crossword", label: "Crossword" },
  { value: "word_search", label: "Word Search" },
  { value: "role_play_cards", label: "Role-Play Cards" },
  { value: "pronunciation_guide", label: "Pronunciation Guide" },
  { value: "debate_cards", label: "Debate Cards" },
  { value: "assessment_rubric", label: "Assessment Rubric" },
];

const GAME_OPTIONS = [
  { value: "quiz", label: "Quiz" },
  { value: "memory", label: "Memory" },
  { value: "matching", label: "Matching" },
  { value: "fill_blanks", label: "Fill-in-the-Blanks" },
  { value: "spelling_bee", label: "Spelling Bee" },
  { value: "sentence_scramble", label: "Sentence Scramble" },
  { value: "crossword_game", label: "Crossword Game" },
  { value: "word_search_game", label: "Word Search Game" },
];

interface BulkItem {
  id: string;
  sourceType: string;
  value: string;
  title: string;
}

export default function BulkFactory() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [items, setItems] = useState<BulkItem[]>([
    { id: "1", sourceType: "ai_topic", value: "", title: "" },
    { id: "2", sourceType: "ai_topic", value: "", title: "" },
    { id: "3", sourceType: "ai_topic", value: "", title: "" },
  ]);
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [targetAge, setTargetAge] = useState("adults");
  const [lessonGoal, setLessonGoal] = useState("general_english");
  const [teachingStyle, setTeachingStyle] = useState("communicative");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["worksheet", "vocabulary_list", "flashcards", "lesson_plan"]);
  const [selectedGames, setSelectedGames] = useState<string[]>(["quiz", "matching"]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [bulkTitle, setBulkTitle] = useState("");

  const createBulk = trpc.bulk.create.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
      toast.success(`Bulk job started! Processing ${items.filter(i => i.value.trim()).length} items...`);
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: jobStatus, refetch: refetchStatus } = trpc.bulk.status.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: jobId ? 3000 : false,
    }
  );

  const { data: bulkJobs } = trpc.bulk.list.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (jobStatus?.status === "completed" || jobStatus?.status === "error") {
      refetchStatus();
    }
  }, [jobStatus?.status]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="bg-gray-900 border-gray-700 max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign in to use Bulk Factory</h2>
            <p className="text-gray-400 mb-6">Generate multiple lesson packages at once</p>
            <Button onClick={() => window.location.href = getLoginUrl()} className="bg-violet-600 hover:bg-violet-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), sourceType: "ai_topic", value: "", title: "" }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof BulkItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const toggleProduct = (value: string) => {
    setSelectedProducts(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  const toggleGame = (value: string) => {
    setSelectedGames(prev =>
      prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]
    );
  };

  const handleStart = () => {
    const validItems = items.filter(i => i.value.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item to process");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("Select at least one product type");
      return;
    }
    createBulk.mutate({
      title: bulkTitle || `Bulk Job — ${validItems.length} items`,
      cefrLevel,
      targetAge,
      lessonGoal,
      teachingStyle,
      selectedProducts,
      selectedGames,
      items: validItems.map(i => ({
        sourceType: i.sourceType,
        value: i.value.trim(),
        title: i.title.trim() || undefined,
      })),
    });
  };

  const progressPercent = jobStatus
    ? Math.round(((jobStatus.completedItems || 0) + (jobStatus.failedItems || 0)) / jobStatus.totalItems * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Bulk Factory</h1>
                <p className="text-xs text-gray-400">Process up to 20 sources at once</p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleStart}
            disabled={createBulk.isPending || !!jobId}
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold"
          >
            {createBulk.isPending ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" /> Starting...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Start Bulk Generation</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active Job Status */}
        {jobId && jobStatus && (
          <Card className="bg-gray-900 border-gray-700 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {jobStatus.status === "running" && (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
                  )}
                  {jobStatus.status === "completed" && <CheckCircle2 className="w-6 h-6 text-green-400" />}
                  {jobStatus.status === "error" && <XCircle className="w-6 h-6 text-red-400" />}
                  <div>
                    <h3 className="font-semibold text-white">
                      {jobStatus.status === "running" ? "Processing..." :
                       jobStatus.status === "completed" ? "Bulk Job Complete!" :
                       "Job Error"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {jobStatus.completedItems || 0} / {jobStatus.totalItems} completed
                      {(jobStatus.failedItems || 0) > 0 && ` • ${jobStatus.failedItems} failed`}
                    </p>
                  </div>
                </div>
                {jobStatus.status === "completed" && (
                  <Button onClick={() => navigate("/dashboard")} className="bg-green-600 hover:bg-green-700">
                    <Package className="w-4 h-4 mr-2" /> View Projects
                  </Button>
                )}
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-right text-sm text-gray-400 mt-1">{progressPercent}%</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                Sources ({items.filter(i => i.value.trim()).length} / {items.length} filled)
              </h2>
              <Button variant="outline" size="sm" onClick={addItem} disabled={items.length >= 20}
                className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Plus className="w-4 h-4 mr-1" /> Add Source
              </Button>
            </div>

            {/* Batch title */}
            <div>
              <Label className="text-gray-400 text-sm">Batch Name (optional)</Label>
              <Input
                value={bulkTitle}
                onChange={e => setBulkTitle(e.target.value)}
                placeholder="e.g. B2 Business English Pack — Week 3"
                className="bg-gray-800 border-gray-600 text-white mt-1"
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <Card key={item.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-500 text-sm font-mono mt-2 w-5 shrink-0">{idx + 1}</span>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Select value={item.sourceType} onValueChange={v => updateItem(item.id, "sourceType", v)}>
                            <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              {Object.entries(SOURCE_ICONS).map(([type, icon]) => (
                                <SelectItem key={type} value={type} className="text-white hover:bg-gray-700">
                                  <span className="flex items-center gap-2">{icon} {type.replace("_", " ")}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={item.title}
                            onChange={e => updateItem(item.id, "title", e.target.value)}
                            placeholder="Title (optional)"
                            className="bg-gray-800 border-gray-600 text-white text-sm"
                          />
                        </div>
                        {item.sourceType === "text" || item.sourceType === "ai_topic" ? (
                          <Textarea
                            value={item.value}
                            onChange={e => updateItem(item.id, "value", e.target.value)}
                            placeholder={SOURCE_PLACEHOLDERS[item.sourceType]}
                            className="bg-gray-800 border-gray-600 text-white text-sm resize-none"
                            rows={2}
                          />
                        ) : (
                          <Input
                            value={item.value}
                            onChange={e => updateItem(item.id, "value", e.target.value)}
                            placeholder={SOURCE_PLACEHOLDERS[item.sourceType] || "Enter URL or value..."}
                            className="bg-gray-800 border-gray-600 text-white text-sm"
                          />
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}
                        className="text-gray-500 hover:text-red-400 mt-1 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick fill templates */}
            <Card className="bg-gray-800/50 border-gray-700 border-dashed">
              <CardContent className="p-4">
                <p className="text-sm text-gray-400 mb-3 font-medium">Quick Fill Templates</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "5 Grammar Topics", items: ["Present Perfect B1", "Past Simple vs Past Continuous B1", "Modal Verbs B2", "Passive Voice B2", "Conditionals B2"] },
                    { label: "5 BBC Articles", items: ["https://www.bbc.co.uk/learningenglish/english/features/6-minute-english", "https://www.bbc.co.uk/learningenglish/english/features/6-minute-vocabulary", "https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak", "https://www.bbc.co.uk/learningenglish/english/features/lingohack", "https://www.bbc.co.uk/learningenglish/english/features/news-review"] },
                    { label: "5 Business Topics", items: ["Job Interview Skills C1", "Business Email Writing B2", "Presentation Skills C1", "Negotiation Language B2", "Office Small Talk B1"] },
                  ].map(template => (
                    <Button key={template.label} variant="outline" size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                      onClick={() => {
                        const newItems = template.items.map((v, i) => ({
                          id: `template-${Date.now()}-${i}`,
                          sourceType: v.startsWith("http") ? "url" : "ai_topic",
                          value: v,
                          title: "",
                        }));
                        setItems(newItems);
                        toast.success(`Loaded ${template.label}`);
                      }}>
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Configuration */}
          <div className="space-y-4">
            {/* Context */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" /> Context (Applied to All)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-xs">CEFR Level</Label>
                  <Select value={cefrLevel} onValueChange={setCefrLevel}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map(l => (
                        <SelectItem key={l} value={l} className="text-white hover:bg-gray-700">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Target Age</Label>
                  <Select value={targetAge} onValueChange={setTargetAge}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {[
                        { value: "young_learners", label: "Young Learners (6-10)" },
                        { value: "teenagers", label: "Teenagers (11-16)" },
                        { value: "young_adults", label: "Young Adults (17-25)" },
                        { value: "adults", label: "Adults (26-60)" },
                        { value: "mixed", label: "Mixed" },
                      ].map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-white hover:bg-gray-700">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Lesson Goal</Label>
                  <Select value={lessonGoal} onValueChange={setLessonGoal}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {[
                        { value: "general_english", label: "General English" },
                        { value: "business_english", label: "Business English" },
                        { value: "exam_prep_fce", label: "FCE Exam Prep" },
                        { value: "exam_prep_ielts", label: "IELTS Prep" },
                        { value: "conversation", label: "Conversation" },
                        { value: "kids_fun", label: "Kids & Fun" },
                      ].map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-white hover:bg-gray-700">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Teaching Style</Label>
                  <Select value={teachingStyle} onValueChange={setTeachingStyle}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {[
                        { value: "communicative", label: "Communicative (CLT)" },
                        { value: "task_based", label: "Task-Based (TBL)" },
                        { value: "grammar_translation", label: "Grammar-Translation" },
                        { value: "eclectic", label: "Eclectic / Mixed" },
                      ].map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-white hover:bg-gray-700">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300">Products to Generate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => toggleProduct(p.value)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        selectedProducts.includes(p.value)
                          ? "bg-violet-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Games */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300">Games to Generate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {GAME_OPTIONS.map(g => (
                    <button
                      key={g.value}
                      onClick={() => toggleGame(g.value)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        selectedGames.includes(g.value)
                          ? "bg-pink-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gradient-to-br from-violet-900/30 to-pink-900/30 border-violet-700/50">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-white mb-2">Batch Summary</p>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>Sources:</span>
                    <span className="font-medium text-white">{items.filter(i => i.value.trim()).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Products per source:</span>
                    <span className="font-medium text-white">{selectedProducts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Games per source:</span>
                    <span className="font-medium text-white">{selectedGames.length}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-1 mt-1 flex justify-between font-semibold">
                    <span>Total items:</span>
                    <span className="text-violet-300">
                      {items.filter(i => i.value.trim()).length * (selectedProducts.length + selectedGames.length)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Previous Bulk Jobs */}
        {bulkJobs && bulkJobs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Previous Bulk Jobs
            </h2>
            <div className="space-y-3">
              {bulkJobs.map(job => (
                <Card key={job.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {job.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {job.status === "running" && <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-500 border-t-transparent" />}
                      {job.status === "error" && <XCircle className="w-5 h-5 text-red-400" />}
                      {job.status === "pending" && <Clock className="w-5 h-5 text-gray-400" />}
                      <div>
                        <p className="font-medium text-white text-sm">{job.title || `Bulk Job #${job.id}`}</p>
                        <p className="text-xs text-gray-400">
                          {job.completedItems || 0}/{job.totalItems} items • {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === "completed" ? "default" : job.status === "error" ? "destructive" : "secondary"}>
                        {job.status}
                      </Badge>
                      {job.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs">
                          View Projects
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
