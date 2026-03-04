import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, ExternalLink, Edit3 } from "lucide-react";
import { Streamdown } from "streamdown";

interface ProductPreviewModalProps {
  product: {
    id: number;
    type: string;
    title: string | null;
    content: any;
    canvaEditUrl?: string | null;
    canvaViewUrl?: string | null;
    pdfUrl?: string | null;
    pngUrl?: string | null;
    pptxUrl?: string | null;
  };
  onClose: () => void;
}

const PRODUCT_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  vocabulary_list: "Vocabulary List",
  flashcards: "Flashcards",
  grammar_guide: "Grammar Guide",
  writing_exercise: "Writing Exercises",
  listening_comprehension: "Listening Tasks",
  lesson_plan: "Lesson Plan",
  mini_textbook: "Mini Textbook",
  discussion_questions: "Discussion Questions",
  homework: "Homework",
  teacher_notes: "Teacher Notes",
};

function renderContent(type: string, content: any): React.ReactNode {
  if (!content) return <p className="text-muted-foreground">No content available</p>;

  // Render as markdown if content has a 'markdown' field
  if (content.markdown) {
    return <Streamdown>{content.markdown}</Streamdown>;
  }

  // Vocabulary list
  if (type === "vocabulary_list" && content.words) {
    return (
      <div className="space-y-3">
        {content.words.map((w: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-primary">{w.word}</span>
                {w.partOfSpeech && <span className="text-xs text-muted-foreground italic">({w.partOfSpeech})</span>}
                {w.cefrLevel && <Badge variant="outline" className="text-xs">{w.cefrLevel}</Badge>}
              </div>
              <p className="text-sm mt-0.5">{w.definition}</p>
              {w.exampleSentence && <p className="text-xs text-muted-foreground italic mt-1">"{w.exampleSentence}"</p>}
              {w.polishTranslation && <p className="text-xs font-medium text-primary/70 mt-1">🇵🇱 {w.polishTranslation}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flashcards
  if (type === "flashcards" && content.cards) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {content.cards.map((card: any, i: number) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 p-4 text-center font-bold text-primary">{card.front}</div>
            <div className="p-4 text-sm text-center text-muted-foreground whitespace-pre-line">{card.back}</div>
          </div>
        ))}
      </div>
    );
  }

  // Worksheet / exercises with sections
  if (content.sections) {
    return (
      <div className="space-y-6">
        {content.sections.map((section: any, i: number) => (
          <div key={i}>
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{i + 1}</span>
              {section.title}
            </h3>
            {section.instructions && <p className="text-sm text-muted-foreground mb-3 italic">{section.instructions}</p>}
            {section.text && <p className="text-sm leading-relaxed mb-3 bg-muted/50 p-4 rounded-lg">{section.text}</p>}
            {section.questions && (
              <ol className="space-y-2">
                {section.questions.map((q: any, qi: number) => (
                  <li key={qi} className="text-sm">
                    <span className="font-medium">{qi + 1}. </span>
                    {typeof q === "string" ? q : q.question || q.text || JSON.stringify(q)}
                    {q.options && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {q.options.map((opt: string, oi: number) => (
                          <li key={oi} className="text-muted-foreground">
                            {String.fromCharCode(65 + oi)}) {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {section.exercises && (
              <ol className="space-y-2">
                {section.exercises.map((ex: any, ei: number) => (
                  <li key={ei} className="text-sm">
                    <span className="font-medium">{ei + 1}. </span>
                    {typeof ex === "string" ? ex : ex.task || ex.instruction || JSON.stringify(ex)}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Lesson plan
  if (content.stages) {
    return (
      <div className="space-y-4">
        {content.objectives && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <h3 className="font-bold mb-2">Learning Objectives</h3>
            <ul className="space-y-1">
              {content.objectives.map((obj: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> {obj}
                </li>
              ))}
            </ul>
          </div>
        )}
        {content.stages.map((stage: any, i: number) => (
          <div key={i} className="border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{stage.name || stage.title}</h3>
              {stage.duration && <Badge variant="secondary">{stage.duration} min</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{stage.description || stage.activity}</p>
            {stage.materials && <p className="text-xs text-muted-foreground mt-1">Materials: {stage.materials}</p>}
          </div>
        ))}
      </div>
    );
  }

  // Generic JSON fallback — render as formatted text
  if (typeof content === "object") {
    const text = Object.entries(content)
      .filter(([k]) => !["title","level"].includes(k))
      .map(([k, v]) => `**${k.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase())}**\n\n${
        Array.isArray(v) ? v.map((item, i) => `${i+1}. ${typeof item === "string" ? item : JSON.stringify(item)}`).join("\n") : String(v)
      }`)
      .join("\n\n---\n\n");
    return <Streamdown>{text}</Streamdown>;
  }

  return <p className="text-sm">{String(content)}</p>;
}

export default function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-lg">{PRODUCT_LABELS[product.type] || product.type}</h2>
            {product.title && <p className="text-sm text-muted-foreground truncate max-w-md">{product.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            {product.canvaEditUrl && (
              <Button size="sm" variant="outline" onClick={() => window.open(product.canvaEditUrl!, "_blank")}>
                <Edit3 className="w-4 h-4 mr-1.5" /> Edit in Canva
              </Button>
            )}
            {product.pdfUrl && (
              <a href={product.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1.5" /> PDF
                </Button>
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="prose prose-sm max-w-none">
            {renderContent(product.type, product.content)}
          </div>
        </div>
      </div>
    </div>
  );
}
