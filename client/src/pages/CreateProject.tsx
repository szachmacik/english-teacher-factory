import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useRef } from "react";
import {
  Youtube, Globe, FileText, Mic, Image, Lightbulb, BookOpen,
  ArrowLeft, ArrowRight, Zap, Loader2, Upload, X, ChevronDown,
  Music, FileSearch, Layers, CheckCircle2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import VoiceRecorder from "@/components/VoiceRecorder";

// ─── Source Types ─────────────────────────────────────────────────────────────
const SOURCE_TYPES = [
  {
    id: "youtube",
    icon: Youtube,
    label: "YouTube Video",
    color: "from-red-500 to-red-600",
    bg: "bg-red-50 border-red-200",
    description: "Extract transcript & metadata from any YouTube video",
    placeholder: "https://www.youtube.com/watch?v=...",
    inputType: "url",
  },
  {
    id: "url",
    icon: Globe,
    label: "Web Article / Blog",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 border-blue-200",
    description: "Scrape content from any webpage, article or blog post",
    placeholder: "https://www.bbc.com/news/article...",
    inputType: "url",
  },
  {
    id: "pdf",
    icon: FileText,
    label: "PDF Document",
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-50 border-orange-200",
    description: "Upload a PDF textbook, article or document",
    placeholder: "Upload PDF file",
    inputType: "file",
  },
  {
    id: "audio",
    icon: Mic,
    label: "Audio / Podcast",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 border-purple-200",
    description: "Upload audio file — AI transcribes and creates materials",
    placeholder: "Upload MP3, WAV, M4A",
    inputType: "file",
  },
  {
    id: "image",
    icon: Image,
    label: "Image / Infographic",
    color: "from-green-500 to-green-600",
    bg: "bg-green-50 border-green-200",
    description: "Upload an image — AI reads text and visual content",
    placeholder: "Upload JPG, PNG, WEBP",
    inputType: "file",
  },
  {
    id: "text",
    icon: FileSearch,
    label: "Paste Text",
    color: "from-cyan-500 to-cyan-600",
    bg: "bg-cyan-50 border-cyan-200",
    description: "Paste any text: article, story, dialogue, grammar rules",
    placeholder: "Paste your text here...",
    inputType: "textarea",
  },
  {
    id: "ai_topic",
    icon: Lightbulb,
    label: "AI Topic Generator",
    color: "from-yellow-500 to-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
    description: "Give AI a topic and it generates the source content first",
    placeholder: "e.g. British culture, climate change, job interviews...",
    inputType: "text",
  },
  {
    id: "voice_note",
    icon: Mic,
    label: "Voice Note",
    color: "from-pink-500 to-pink-600",
    bg: "bg-pink-50 border-pink-200",
    description: "Record directly in browser or upload a voice note",
    placeholder: "Upload voice recording",
    inputType: "voice",
  },
  {
    id: "song",
    icon: Music,
    label: "Song / Lyrics",
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    description: "Paste song lyrics or link to create music-based lessons",
    placeholder: "Paste song lyrics or YouTube music video URL...",
    inputType: "textarea",
  },
  {
    id: "multi",
    icon: Layers,
    label: "Multi-Source Blend",
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50 border-violet-200",
    description: "Combine multiple sources into one unified lesson ecosystem",
    placeholder: "Add YouTube URL + paste text + topic...",
    inputType: "multi",
  },
] as const;

type SourceId = typeof SOURCE_TYPES[number]["id"];

// ─── Product Types ────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { id: "worksheet", label: "Worksheet", emoji: "📄" },
  { id: "vocabulary_list", label: "Vocabulary List", emoji: "📚" },
  { id: "flashcards", label: "Flashcards", emoji: "🃏" },
  { id: "grammar_guide", label: "Grammar Guide", emoji: "📐" },
  { id: "writing_exercise", label: "Writing Exercise", emoji: "✍️" },
  { id: "listening_comprehension", label: "Listening Task", emoji: "🎧" },
  { id: "lesson_plan", label: "Lesson Plan", emoji: "📋" },
  { id: "mini_textbook", label: "Mini Textbook", emoji: "📖" },
  { id: "discussion_questions", label: "Discussion Qs", emoji: "💬" },
  { id: "homework", label: "Homework Sheet", emoji: "🏠" },
  { id: "teacher_notes", label: "Teacher Notes", emoji: "👩‍🏫" },
  { id: "song_worksheet", label: "Song Worksheet", emoji: "🎵" },
  { id: "crossword", label: "Crossword", emoji: "🔲" },
  { id: "word_search", label: "Word Search", emoji: "🔍" },
  { id: "role_play_cards", label: "Role-Play Cards", emoji: "🎭" },
  { id: "pronunciation_guide", label: "Pronunciation Guide", emoji: "🗣️" },
  { id: "debate_cards", label: "Debate Cards", emoji: "⚖️" },
  { id: "error_correction", label: "Error Correction", emoji: "✏️" },
  { id: "reading_passage", label: "Reading Passage", emoji: "📰" },
  { id: "assessment_rubric", label: "Assessment Rubric", emoji: "📊" },
  { id: "parent_newsletter", label: "Parent Newsletter", emoji: "📬" },
];

const GAME_TYPES = [
  { id: "quiz", label: "Quiz Game", emoji: "🧠" },
  { id: "memory", label: "Memory Cards", emoji: "🃏" },
  { id: "matching", label: "Matching Game", emoji: "🔗" },
  { id: "fill_blanks", label: "Fill in Blanks", emoji: "✏️" },
  { id: "spelling_bee", label: "Spelling Bee", emoji: "🐝" },
  { id: "sentence_scramble", label: "Sentence Scramble", emoji: "🔀" },
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const AGE_GROUPS = ["Kids (6-10)", "Tweens (11-13)", "Teens (14-17)", "Young Adults (18-25)", "Adults (25+)", "Mixed"];
const LESSON_STYLES = ["Communicative", "Grammar-Translation", "Task-Based", "Flipped Classroom", "Project-Based", "Test Prep", "Conversation Club", "Business English"];
const LESSON_GOALS = ["Vocabulary Building", "Grammar Practice", "Reading Comprehension", "Listening Skills", "Speaking & Conversation", "Writing Skills", "Exam Preparation", "Cultural Awareness", "Pronunciation", "Mixed Skills"];
const SCHOOL_TYPES = ["Public School", "Private School", "Language School", "University", "Online Tutoring", "Corporate Training", "Homeschool", "Summer Camp"];

export default function CreateProject() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  // Step management
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Source selection
  const [selectedSource, setSelectedSource] = useState<SourceId>("youtube");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-source
  const [multiSources, setMultiSources] = useState<{ type: string; value: string }[]>([]);
  const [multiInput, setMultiInput] = useState("");
  const [multiType, setMultiType] = useState("youtube");

  // Context configuration
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [targetAge, setTargetAge] = useState("Adults (25+)");
  const [lessonStyle, setLessonStyle] = useState("Communicative");
  const [lessonGoal, setLessonGoal] = useState("Mixed Skills");
  const [schoolType, setSchoolType] = useState("Language School");
  const [productCount, setProductCount] = useState([15]);

  // Product selection
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    PRODUCT_TYPES.slice(0, 11).map(p => p.id)
  );
  const [selectedGames, setSelectedGames] = useState<string[]>(
    GAME_TYPES.map(g => g.id)
  );

  const source = SOURCE_TYPES.find(s => s.id === selectedSource)!;

  const createProject = trpc.factory.projects.createFromSource.useMutation({
    onSuccess: (data: any) => {
      toast.success("🚀 Factory started!", {
        description: `Generating ${selectedProducts.length} products + ${selectedGames.length} games...`,
      });
      navigate(`/project/${data.projectId}`);
    },
    onError: (err: any) => {
      toast.error("Failed to start factory", { description: err.message });
    },
  });

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadedFile(file);
    // In real implementation, upload to S3 via tRPC
    // For now, create a local object URL as placeholder
    const url = URL.createObjectURL(file);
    setUploadedUrl(url);
    setIsUploading(false);
    toast.success(`File "${file.name}" ready`);
  };

  const handleSubmit = () => {
    let primarySource = "";
    let sourceType = selectedSource;

    if (selectedSource === "multi") {
      primarySource = multiSources.map(s => `[${s.type}] ${s.value}`).join("\n");
    } else if (["text", "song"].includes(selectedSource)) {
      primarySource = sourceText;
    } else if (["pdf", "audio", "image", "voice_note"].includes(selectedSource)) {
      primarySource = uploadedUrl || uploadedFile?.name || "";
    } else {
      primarySource = sourceInput;
    }

    if (!primarySource.trim()) {
      toast.error("Please provide a source first");
      return;
    }

    // Map to createFromSource schema
    const mutateInput: any = {
      sourceType: sourceType === "song" ? "text" : sourceType,
    };
    if (sourceType === "youtube") mutateInput.youtubeUrl = primarySource;
    else if (sourceType === "url") mutateInput.sourceUrl = primarySource;
    else if (["pdf", "audio", "image", "voice_note"].includes(sourceType)) {
      mutateInput.sourceFileUrl = uploadedUrl || primarySource;
      mutateInput.sourceFileName = uploadedFile?.name;
    } else if (["text", "song", "ai_topic"].includes(sourceType)) {
      mutateInput.sourceRawText = sourceText || primarySource;
    } else if (sourceType === "multi") {
      mutateInput.sourceSources = multiSources.map(s => `[${s.type}] ${s.value}`);
    }
    if (cefrLevel) mutateInput.cefrLevel = cefrLevel as any;
    createProject.mutate(mutateInput);
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleGame = (id: string) => {
    setSelectedGames(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* TOP NAV */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">New Product Ecosystem</h1>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? "bg-primary text-primary-foreground" :
                  step > s ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-green-500" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── STEP 1: SOURCE SELECTION ── */}
        {step === 1 && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Source</h2>
              <p className="text-muted-foreground">What content will power your lesson ecosystem?</p>
            </div>

            {/* Source type grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {SOURCE_TYPES.map((src) => {
                const Icon = src.icon;
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => { setSelectedSource(src.id); setSourceInput(""); setSourceText(""); setUploadedFile(null); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${src.color} flex items-center justify-center mb-2`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold text-xs leading-tight">{src.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Source input area */}
            <div className={`rounded-2xl border-2 p-6 mb-6 transition-colors ${source.bg}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${source.color} flex items-center justify-center`}>
                  <source.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold">{source.label}</div>
                  <div className="text-xs text-muted-foreground">{source.description}</div>
                </div>
              </div>

              {/* URL input */}
              {source.inputType === "url" && (
                <Input
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder={source.placeholder}
                  className="bg-white/80 border-white/50"
                />
              )}

              {/* Text input */}
              {source.inputType === "text" && (
                <Input
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder={source.placeholder}
                  className="bg-white/80 border-white/50"
                />
              )}

              {/* Textarea */}
              {source.inputType === "textarea" && (
                <Textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={source.placeholder}
                  rows={8}
                  className="bg-white/80 border-white/50 resize-none"
                />
              )}

              {/* File upload */}
              {source.inputType === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      selectedSource === "pdf" ? ".pdf" :
                      selectedSource === "audio" || selectedSource === "voice_note" ? ".mp3,.wav,.m4a,.ogg,.webm" :
                      selectedSource === "image" ? ".jpg,.jpeg,.png,.webp,.gif" : "*"
                    }
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-white/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{uploadedFile.name}</span>
                      <button onClick={() => { setUploadedFile(null); setUploadedUrl(""); }}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-8 border-2 border-dashed border-white/70 rounded-xl bg-white/40 hover:bg-white/60 transition-colors text-center"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="font-medium text-sm">{source.placeholder}</div>
                      <div className="text-xs text-muted-foreground mt-1">Click to browse or drag & drop</div>
                    </button>
                  )}
                </div>
              )}

              {/* Voice Note — recorder + file upload */}
              {source.inputType === "voice" && (
                <div className="space-y-3">
                  <VoiceRecorder
                    onRecordingComplete={(url) => {
                      setUploadedUrl(url);
                      setUploadedFile({ name: `voice-note-${Date.now()}.webm` } as File);
                    }}
                    maxDurationSeconds={300}
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or upload a file</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".mp3,.wav,.m4a,.ogg,.webm"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    {uploadedFile && uploadedFile.name.startsWith("voice-note") ? null : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 border-2 border-dashed border-white/70 rounded-xl bg-white/40 hover:bg-white/60 transition-colors text-center"
                      >
                        <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">Upload audio file</div>
                        <div className="text-xs text-muted-foreground">MP3, WAV, M4A, OGG, WebM</div>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Multi-source */}
              {source.inputType === "multi" && (
                <div>
                  <div className="flex gap-2 mb-3">
                    <Select value={multiType} onValueChange={setMultiType}>
                      <SelectTrigger className="w-40 bg-white/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.filter(s => s.id !== "multi").map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={multiInput}
                      onChange={(e) => setMultiInput(e.target.value)}
                      placeholder="URL, text, or topic..."
                      className="flex-1 bg-white/80 border-white/50"
                    />
                    <Button
                      onClick={() => {
                        if (multiInput.trim()) {
                          setMultiSources(prev => [...prev, { type: multiType, value: multiInput.trim() }]);
                          setMultiInput("");
                        }
                      }}
                      variant="outline"
                      className="bg-white/80"
                    >
                      Add
                    </Button>
                  </div>
                  {multiSources.length > 0 && (
                    <div className="space-y-2">
                      {multiSources.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-white/70 rounded-lg text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">{s.type}</Badge>
                          <span className="flex-1 truncate">{s.value}</span>
                          <button onClick={() => setMultiSources(prev => prev.filter((_, j) => j !== i))}>
                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {multiSources.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Add at least 2 sources to blend them</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={
                  (["youtube", "url"].includes(selectedSource) && !sourceInput.trim()) ||
                  (["text", "song"].includes(selectedSource) && !sourceText.trim()) ||
                  (["pdf", "audio", "image", "voice_note"].includes(selectedSource) && !uploadedFile) ||
                  (selectedSource === "ai_topic" && !sourceInput.trim()) ||
                  (selectedSource === "multi" && multiSources.length < 1)
                }
              >
                Next: Configure Context <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: CONTEXT CONFIGURATION ── */}
        {step === 2 && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Configure Your Context</h2>
              <p className="text-muted-foreground">Tell the AI about your students and teaching goals</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {/* CEFR Level */}
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-sm font-semibold mb-3 block">CEFR Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {CEFR_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setCefrLevel(level)}
                      className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                        cefrLevel === level
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-sm font-semibold mb-3 block">Student Age Group</label>
                <Select value={targetAge} onValueChange={setTargetAge}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(age => (
                      <SelectItem key={age} value={age}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lesson Style */}
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-sm font-semibold mb-3 block">Teaching Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {LESSON_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => setLessonStyle(style)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        lessonStyle === style
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Goal */}
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-sm font-semibold mb-3 block">Primary Lesson Goal</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {LESSON_GOALS.map(goal => (
                    <button
                      key={goal}
                      onClick={() => setLessonGoal(goal)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors text-left ${
                        lessonGoal === goal
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              {/* School Type */}
              <div className="bg-card border border-border rounded-xl p-5 sm:col-span-2">
                <label className="text-sm font-semibold mb-3 block">School / Teaching Context</label>
                <div className="grid grid-cols-4 gap-2">
                  {SCHOOL_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setSchoolType(type)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        schoolType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Choose Products <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PRODUCT SELECTION ── */}
        {step === 3 && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Select Products to Generate</h2>
              <p className="text-muted-foreground">Choose which materials the factory should produce</p>
            </div>

            {/* Products */}
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">📄 Educational Materials ({selectedProducts.length}/{PRODUCT_TYPES.length})</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedProducts(PRODUCT_TYPES.map(p => p.id))}>
                    All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedProducts([])}>
                    None
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {PRODUCT_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                      selectedProducts.includes(p.id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="text-xl mb-1">{p.emoji}</div>
                    <div className="text-xs font-medium leading-tight">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Games */}
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">🎮 Interactive Games ({selectedGames.length}/{GAME_TYPES.length})</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedGames(GAME_TYPES.map(g => g.id))}>
                    All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedGames([])}>
                    None
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GAME_TYPES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGame(g.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selectedGames.includes(g.id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="text-xs font-medium">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-5 mb-6">
              <h3 className="font-bold mb-3">🏭 Factory Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{selectedProducts.length}</div>
                  <div className="text-xs text-muted-foreground">Materials</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{selectedGames.length}</div>
                  <div className="text-xs text-muted-foreground">Games</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{selectedProducts.length}</div>
                  <div className="text-xs text-muted-foreground">Canva Designs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{selectedProducts.length + selectedGames.length}</div>
                  <div className="text-xs text-muted-foreground">Total Items</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Source: <strong>{source.label}</strong> · Level: <strong>{cefrLevel}</strong> · Age: <strong>{targetAge}</strong> · Goal: <strong>{lessonGoal}</strong>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createProject.isPending || (selectedProducts.length === 0 && selectedGames.length === 0)}
                size="lg"
                className="gap-2"
              >
                {createProject.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Factory...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Launch Factory ({selectedProducts.length + selectedGames.length} items)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
