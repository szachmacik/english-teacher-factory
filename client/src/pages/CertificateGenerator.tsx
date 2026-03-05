import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Plus, Trash2, Award, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

const CERT_TEMPLATES = [
  { id: "classic", name: "Classic Gold", bg: "from-yellow-50 to-amber-50", border: "border-yellow-400", accent: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
  { id: "modern", name: "Modern Blue", bg: "from-blue-50 to-indigo-50", border: "border-indigo-400", accent: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800" },
  { id: "elegant", name: "Elegant Purple", bg: "from-purple-50 to-violet-50", border: "border-purple-400", accent: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
  { id: "fresh", name: "Fresh Green", bg: "from-green-50 to-emerald-50", border: "border-green-400", accent: "text-green-700", badge: "bg-green-100 text-green-800" },
];

interface CertData {
  studentName: string;
  courseName: string;
  achievement: string;
  date: string;
  teacherName: string;
  schoolName: string;
  level: string;
  notes: string;
}

export default function CertificateGenerator() {
  useAuth({ redirectOnUnauthenticated: true });
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id || "0");
  const printRef = useRef<HTMLDivElement>(null);

  const [template, setTemplate] = useState("classic");
  const [students, setStudents] = useState<CertData[]>([{
    studentName: "",
    courseName: "English Language Course",
    achievement: "Successfully completed",
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    teacherName: "",
    schoolName: "",
    level: "B1",
    notes: "",
  }]);
  const [previewIdx, setPreviewIdx] = useState(0);

  const { data: projectData } = trpc.factory.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const project = projectData?.project;
  const tpl = CERT_TEMPLATES.find(t => t.id === template) ?? CERT_TEMPLATES[0];

  const addStudent = () => {
    const base = students[0];
    setStudents([...students, { ...base, studentName: "" }]);
    setPreviewIdx(students.length);
  };

  const removeStudent = (i: number) => {
    if (students.length === 1) return;
    const next = students.filter((_, idx) => idx !== i);
    setStudents(next);
    setPreviewIdx(Math.min(previewIdx, next.length - 1));
  };

  const updateStudent = (i: number, field: keyof CertData, value: string) => {
    setStudents(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Certificates</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        .cert-page { page-break-after: always; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        @media print { .cert-page { page-break-after: always; } }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
    toast.success("Print dialog opened!");
  };

  const current = students[previewIdx] ?? students[0];

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Project
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">Certificate Generator</h1>
            <p className="text-xs text-muted-foreground">{project?.title || "Loading..."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print All
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-2" /> Save PDF
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: SETTINGS */}
          <div className="space-y-6">
            {/* Template */}
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Certificate Template</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {CERT_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${template === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${t.bg} border ${t.border} mb-2`} />
                      <div className="text-xs font-medium">{t.name}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Students */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Students ({students.length})</CardTitle>
                  <Button size="sm" variant="outline" onClick={addStudent}>
                    <Plus className="w-4 h-4 mr-1" /> Add Student
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {students.map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${previewIdx === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    onClick={() => setPreviewIdx(i)}>
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">Student {i + 1}</Badge>
                      {students.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeStudent(i); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Student Name *</Label>
                        <Input value={s.studentName} onChange={e => updateStudent(i, "studentName", e.target.value)}
                          placeholder="e.g. Anna Kowalska" className="mt-1 h-8 text-sm" onClick={e => e.stopPropagation()} />
                      </div>
                      <div>
                        <Label className="text-xs">Level</Label>
                        <Select value={s.level} onValueChange={v => updateStudent(i, "level", v)}>
                          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["A1","A2","B1","B2","C1","C2"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Shared fields */}
                <div className="pt-2 border-t border-border space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Shared across all certificates:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Course Name</Label>
                      <Input value={students[0].courseName} onChange={e => setStudents(prev => prev.map(s => ({ ...s, courseName: e.target.value })))}
                        className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Teacher Name</Label>
                      <Input value={students[0].teacherName} onChange={e => setStudents(prev => prev.map(s => ({ ...s, teacherName: e.target.value })))}
                        className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">School / Organization</Label>
                      <Input value={students[0].schoolName} onChange={e => setStudents(prev => prev.map(s => ({ ...s, schoolName: e.target.value })))}
                        className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input value={students[0].date} onChange={e => setStudents(prev => prev.map(s => ({ ...s, date: e.target.value })))}
                        className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Achievement Text</Label>
                    <Textarea value={students[0].achievement} onChange={e => setStudents(prev => prev.map(s => ({ ...s, achievement: e.target.value })))}
                      className="mt-1 text-sm resize-none" rows={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: PREVIEW */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preview — Student {previewIdx + 1}</h3>
              <div className="flex gap-1">
                {students.map((_, i) => (
                  <button key={i} onClick={() => setPreviewIdx(i)}
                    className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${previewIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Certificate Preview */}
            <div ref={printRef}>
              {students.map((s, i) => (
                <div key={i} className={`cert-page ${i !== previewIdx ? "hidden" : ""}`}>
                  <div className={`relative w-full aspect-[1.414/1] bg-gradient-to-br ${tpl.bg} border-4 ${tpl.border} rounded-2xl p-8 flex flex-col items-center justify-between shadow-xl`}>
                    {/* Corner decorations */}
                    <div className={`absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 ${tpl.border} rounded-tl-lg`} />
                    <div className={`absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 ${tpl.border} rounded-tr-lg`} />
                    <div className={`absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 ${tpl.border} rounded-bl-lg`} />
                    <div className={`absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 ${tpl.border} rounded-br-lg`} />

                    {/* Header */}
                    <div className="text-center">
                      <Award className={`w-12 h-12 mx-auto mb-2 ${tpl.accent}`} />
                      <div className={`text-xs font-bold tracking-[0.3em] uppercase ${tpl.accent} opacity-70`}>Certificate of Achievement</div>
                    </div>

                    {/* Main content */}
                    <div className="text-center space-y-3">
                      <div className="text-sm text-muted-foreground">This is to certify that</div>
                      <div className={`text-3xl font-bold ${tpl.accent}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                        {s.studentName || "Student Name"}
                      </div>
                      <div className="text-sm text-muted-foreground">{s.achievement}</div>
                      <div className={`text-xl font-bold text-foreground`}>{s.courseName}</div>
                      <Badge className={`${tpl.badge} border-0 text-sm px-4 py-1`}>Level {s.level}</Badge>
                    </div>

                    {/* Footer */}
                    <div className="w-full flex items-end justify-between">
                      <div className="text-center">
                        <div className={`w-32 border-t-2 ${tpl.border} mb-1`} />
                        <div className="text-xs text-muted-foreground">{s.teacherName || "Teacher Name"}</div>
                        <div className="text-xs text-muted-foreground opacity-70">Teacher</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-medium ${tpl.accent}`}>{s.date}</div>
                        {s.schoolName && <div className="text-xs text-muted-foreground mt-1">{s.schoolName}</div>}
                      </div>
                      <div className="text-center">
                        <div className={`w-32 border-t-2 ${tpl.border} mb-1`} />
                        <div className="text-xs text-muted-foreground">Signature</div>
                        <div className="text-xs text-muted-foreground opacity-70">Date</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Click "Print All" to print all {students.length} certificate{students.length !== 1 ? "s" : ""} at once
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
