/**
 * AI Content Generator — Multi-Source Edition
 * All generators accept GeneratorCtx for unified interface
 */
import { invokeLLM } from "../_core/llm";

export interface GeneratorCtx {
  text: string;
  analysis: any;
  project: any;
  contextPrompt: string;
}

async function llmJson(system: string, user: string): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: system + " Always respond with valid JSON only." },
      { role: "user", content: user },
    ],
  });
  const raw = (response.choices[0]?.message?.content as string) ?? "{}";
  try {
    const m = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    return JSON.parse(m ? m[1] : raw);
  } catch { return {}; }
}

export async function generateWorksheet(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an expert EFL worksheet designer.",
    `Create a comprehensive English worksheet for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\nContent: ${text.slice(0,1500)}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","beforeReading":[{"type":"discussion","instruction":"...","items":["q1"]}],"whileReading":[{"type":"comprehension","instruction":"...","items":[{"question":"...","answer":"..."}]}],"afterReading":[{"type":"writing","instruction":"...","items":["task1"]}],"vocabulary":[{"word":"...","definition":"..."}],"extension":"..."}`
  );
}

export async function generateVocabularyList(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const vocab = (analysis.vocabulary || []).slice(0, 20);
  return {
    title: `Vocabulary List — ${(analysis.topics||["English Lesson"])[0]}`,
    level,
    words: vocab.map((v: any, i: number) => ({ id: i+1, word: v.word, partOfSpeech: v.partOfSpeech, definition: v.definition, exampleSentence: v.exampleSentence, polishTranslation: v.polishTranslation, cefrLevel: v.cefrLevel })),
    exercises: [{ type: "match", instruction: "Match the word with its definition" }, { type: "gap_fill", instruction: "Fill in the gaps" }, { type: "sentence", instruction: "Write your own sentence" }],
  };
}

export async function generateFlashcards(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const vocab = (analysis.vocabulary || []).slice(0, 20);
  return {
    title: `Flashcard Set — ${(analysis.topics||["English Lesson"])[0]}`,
    level,
    cards: vocab.map((v: any, i: number) => ({ id: i+1, front: v.word, back: `${v.definition}\n\nExample: ${v.exampleSentence}\n\nPolish: ${v.polishTranslation}`, partOfSpeech: v.partOfSpeech, cefrLevel: v.cefrLevel })),
    studyModes: ["flashcard", "quiz", "write"],
  };
}

export async function generateGrammarGuide(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const gp = (analysis.grammarPoints || ["Present Simple"]).join(", ");
  return llmJson(
    "You are an expert EFL grammar teacher.",
    `Create a grammar guide for level ${level}.\nGrammar: ${gp}\nContent: ${text.slice(0,1000)}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","grammarPoints":[{"name":"...","explanation":"...","form":"...","examples":["..."],"commonMistakes":["..."],"exercises":[{"instruction":"...","items":[{"sentence":"...","answer":"..."}]}]}],"quickReference":"..."}`
  );
}

export async function generateWritingExercise(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL writing skills expert.",
    `Create writing exercises for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","exercises":[{"type":"guided_writing","title":"...","instruction":"...","wordCount":"100-150 words","scaffold":["Point 1"],"modelAnswer":"...","assessmentCriteria":["Content","Grammar"]}],"usefulLanguage":["phrase1"],"writingTips":["tip1"]}`
  );
}

export async function generateListeningComprehension(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL listening skills expert.",
    `Create listening comprehension tasks for level ${level}.\nContent: ${text.slice(0,2000)}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","preListening":[{"type":"prediction","instruction":"...","items":["q1"]}],"whileListening":[{"type":"gist","instruction":"...","items":[{"question":"...","answer":"..."}]},{"type":"detail","instruction":"...","items":[{"question":"...","answer":"..."}]}],"postListening":[{"type":"discussion","instruction":"...","items":["q1"]}]}`
  );
}

export async function generateLessonPlan(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const duration = project.lessonDuration || 60;
  return llmJson(
    "You are an expert EFL lesson planner.",
    `Create a ${duration}-minute lesson plan for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\nGrammar: ${(analysis.grammarPoints||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","duration":"${duration} min","objectives":["Students will be able to..."],"materials":["Worksheet"],"stages":[{"name":"Warmer","duration":"5 min","activity":"...","teacherInstructions":"...","studentActivity":"...","interaction":"T-S"}],"homework":"...","differentiation":{"stronger":"...","weaker":"..."},"assessment":"..."}`
  );
}

export async function generateMiniTextbook(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL textbook author.",
    `Create a mini textbook unit for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\nContent: ${text.slice(0,2000)}\n${contextPrompt}\nReturn JSON: {"title":"...","level":"${level}","unitOverview":"...","sections":[{"title":"...","type":"reading","content":"...","exercises":[{"instruction":"...","items":[]}],"keyLanguage":["phrase1"]}],"unitReview":{"questions":["q1"],"selfAssessment":["I can..."]},"glossary":[{"word":"...","definition":"..."}]}`
  );
}

export async function generateDiscussionQuestions(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL speaking skills expert.",
    `Create discussion questions for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Discussion Questions","level":"${level}","warmUp":["q1","q2"],"mainDiscussion":[{"question":"...","followUp":["..."],"vocabulary":["word1"]}],"debate":{"motion":"This house believes that...","proArguments":["..."],"conArguments":["..."]},"rolePlay":{"scenario":"...","roles":["Role A: ...","Role B: ..."]},"usefulLanguage":{"agreeing":["I agree because..."],"disagreeing":["However..."],"adding":["Furthermore..."]}}`
  );
}

export async function generateHomework(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL teacher. Create meaningful homework assignments.",
    `Create homework for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Homework Assignment","level":"${level}","tasks":[{"type":"vocabulary","title":"...","instruction":"...","estimatedTime":"15 minutes","resources":["..."]}],"submissionGuidelines":"...","selfCheckQuestions":["Did I...?"]}`
  );
}

export async function generateTeacherNotes(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an experienced EFL teacher trainer.",
    `Create teacher notes for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\nContent: ${text.slice(0,1500)}\n${contextPrompt}\nReturn JSON: {"title":"Teacher Notes","level":"${level}","backgroundInfo":"...","anticipatedProblems":[{"problem":"...","solution":"..."}],"adaptations":{"online":"...","largeClass":"...","mixedAbility":"..."},"extensionActivities":["..."],"assessmentTips":["..."],"culturalNotes":"...","timingNotes":"...","answerKey":"..."}`
  );
}

export async function generateSongWorksheet(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL teacher specializing in music-based learning.",
    `Create a song worksheet for level ${level}.\nLyrics/content: ${text.slice(0,2000)}\n${contextPrompt}\nReturn JSON: {"title":"Song Worksheet","level":"${level}","preListening":[{"type":"prediction","instruction":"...","items":[]}],"lyricsExercises":[{"type":"gap_fill","instruction":"...","text":"lyrics with ___ blanks","answers":["word1"]}],"languageFocus":[{"feature":"idiom","examples":["..."],"explanation":"..."}],"discussionQuestions":["q1"],"creativeTask":"Write your own verse about..."}`
  );
}

export async function generateCrossword(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const vocab = (analysis.vocabulary || []).slice(0, 15);
  return llmJson(
    "You are an EFL puzzle designer.",
    `Create a crossword puzzle for level ${level} using: ${vocab.map((v:any)=>v.word).join(", ")}\nReturn JSON: {"title":"Crossword Puzzle","level":"${level}","clues":{"across":[{"number":1,"clue":"Definition or sentence with blank","answer":"WORD","row":0,"col":0}],"down":[{"number":2,"clue":"...","answer":"WORD","row":0,"col":0}]},"gridSize":15,"instructions":"Fill in the crossword"}`
  );
}

export async function generateWordSearch(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "A2";
  const vocab = (analysis.vocabulary || []).slice(0, 12);
  return {
    title: "Word Search Puzzle",
    level,
    words: vocab.map((v: any) => v.word.toUpperCase()),
    definitions: vocab.map((v: any) => ({ word: v.word, definition: v.definition })),
    gridSize: 15,
    instructions: "Find the hidden words. Words can go horizontally, vertically, or diagonally.",
  };
}

export async function generateRolePlayCards(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL speaking skills expert.",
    `Create role-play cards for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Role Play Cards","level":"${level}","scenarios":[{"id":1,"title":"...","situation":"...","roles":[{"name":"Role A","objective":"...","background":"...","usefulLanguage":["phrase1"]},{"name":"Role B","objective":"...","background":"...","usefulLanguage":["phrase1"]}],"targetLanguage":["Function: phrase"],"debrief":"..."}],"generalUsefulLanguage":{"starting":["..."],"agreeing":["..."],"closing":["..."]}}`
  );
}

export async function generatePronunciationGuide(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const vocab = (analysis.vocabulary || []).slice(0, 15);
  return llmJson(
    "You are an EFL pronunciation expert.",
    `Create a pronunciation guide for level ${level}.\nWords: ${vocab.map((v:any)=>v.word).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Pronunciation Guide","level":"${level}","words":[{"word":"example","ipa":"/ɪɡˈzɑːmpəl/","syllables":"ex-am-ple","stress":"ex-AM-ple","soundsLike":"ig-ZAM-pul","commonMistake":"..."}],"phonemesFocus":[{"phoneme":"/θ/","description":"...","examples":["think"]}],"minimalPairs":[{"pair":["ship","sheep"],"practice":"..."}],"drills":[{"type":"repetition","instruction":"...","items":["word1"]}],"tips":["tip1"]}`
  );
}

export async function generateDebateCards(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B2";
  return llmJson(
    "You are an EFL debate expert.",
    `Create debate cards for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Debate Cards","level":"${level}","motions":[{"id":1,"motion":"This house believes that...","proArguments":[{"argument":"...","evidence":"...","rebuttal":"..."}],"conArguments":[{"argument":"...","evidence":"...","rebuttal":"..."}],"vocabulary":[{"word":"...","definition":"..."}]}],"debateStructure":{"opening":"2 min","rebuttal":"1 min","closing":"1 min"},"usefulLanguage":{"stating":["In my opinion..."],"countering":["However..."],"conceding":["While I agree that..."]}}`
  );
}

export async function generateErrorCorrection(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const nativeLang = project.nativeLanguage || "Polish";
  return llmJson(
    "You are an EFL error analysis expert.",
    `Create error correction exercises for ${nativeLang}-speaking level ${level} students.\nGrammar: ${(analysis.grammarPoints||[]).join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Error Correction Exercises","level":"${level}","nativeLanguage":"${nativeLang}","sections":[{"type":"spot_the_error","instruction":"Find and correct the mistake","items":[{"sentence":"Incorrect sentence","error":"what is wrong","correction":"Correct sentence","rule":"Grammar rule"}]},{"type":"rewrite","instruction":"Rewrite correctly","items":[{"incorrect":"...","correct":"..."}]}],"commonErrors":[{"error":"...","cause":"L1 interference","correction":"..."}]}`
  );
}

export async function generateReadingPassage(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { text, analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  return llmJson(
    "You are an EFL reading skills expert and graded reader author.",
    `Create a graded reading passage for level ${level}.\nTopic: ${(analysis.topics||[]).join(", ")}\nSource: ${text.slice(0,1500)}\n${contextPrompt}\nReturn JSON: {"title":"Reading Passage","level":"${level}","passage":"Full 300-500 word passage graded to ${level}","glossary":[{"word":"...","definition":"..."}],"comprehensionQuestions":[{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"answer":"A"},{"type":"true_false","statement":"...","answer":true,"justification":"..."},{"type":"open","question":"...","modelAnswer":"..."}],"vocabularyInContext":[{"word":"...","paragraph":1,"meaning":"..."}],"criticalThinking":["Higher-order question"]}`
  );
}

export async function generateAssessmentRubric(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "B1";
  const skills = project.focusSkills || ["speaking", "writing"];
  return llmJson(
    "You are an EFL assessment expert.",
    `Create assessment rubrics for level ${level}.\nSkills: ${skills.join(", ")}\n${contextPrompt}\nReturn JSON: {"title":"Assessment Rubric","level":"${level}","rubrics":[{"skill":"speaking","criteria":[{"name":"Content","weight":"25%","levels":{"excellent":{"score":"4","descriptor":"..."},"good":{"score":"3","descriptor":"..."},"satisfactory":{"score":"2","descriptor":"..."},"needsWork":{"score":"1","descriptor":"..."}}}]}],"selfAssessmentChecklist":["I can..."],"peerAssessmentQuestions":["Did your partner...?"]}`
  );
}

export async function generateParentNewsletter(ctx: GeneratorCtx): Promise<Record<string, unknown>> {
  const { analysis, project, contextPrompt } = ctx;
  const level = project.cefrLevel || analysis.difficulty || "A2";
  const nativeLang = project.nativeLanguage || "Polish";
  return llmJson(
    `You are an EFL teacher writing to parents in ${nativeLang} and English.`,
    `Create a parent newsletter about this English lesson.\nTopic: ${(analysis.topics||["English Lesson"]).join(", ")}\nLevel: ${level}\n${contextPrompt}\nReturn JSON: {"title":"Parent Newsletter","englishVersion":{"greeting":"Dear Parents,","thisWeek":"This week in English class...","whatWelearned":["Learning point 1"],"homeworkTips":["How to help at home"],"upcomingTopics":"Next week...","closing":"Thank you!"},"polishVersion":{"greeting":"Drodzy Rodzice,","thisWeek":"W tym tygodniu...","whatWelearned":["Punkt nauki 1"],"homeworkTips":["Jak pomóc w domu"],"upcomingTopics":"W przyszłym tygodniu...","closing":"Dziękujemy!"},"vocabularyToReview":[{"english":"...","polish":"..."}]}`
  );
}

// ─── Game Generators ──────────────────────────────────────────────────────────

export async function generateQuizGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  return llmJson(
    "You are an EFL quiz designer.",
    `Create a 10-question multiple choice quiz.\nContent: ${text.slice(0,2000)}\nLevel: ${analysis.difficulty||"B1"}\nReturn JSON: {"title":"Quiz","questions":[{"id":1,"question":"...?","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}`
  );
}

export async function generateMemoryGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  const vocab = (analysis.vocabulary || []).slice(0, 12);
  return { title: "Memory Game", pairs: vocab.map((v: any, i: number) => ({ id: i+1, front: v.word, back: v.definition })) };
}

export async function generateMatchingGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  const vocab = (analysis.vocabulary || []).slice(0, 10);
  return { title: "Matching Game", pairs: vocab.map((v: any, i: number) => ({ id: i+1, left: v.word, right: v.definition })) };
}

export async function generateFillBlanksGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  return llmJson(
    "You are an EFL exercise designer.",
    `Create 8 fill-in-the-blank sentences.\nContent: ${text.slice(0,1500)}\nLevel: ${analysis.difficulty||"B1"}\nReturn JSON: {"title":"Fill in the Blanks","sentences":[{"id":1,"text":"The ___ is very important.","answer":"language","options":["language","picture","music","sport"]}]}`
  );
}

export async function generateSpellingBeeGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  const vocab = (analysis.vocabulary || []).slice(0, 15);
  return { title: "Spelling Bee", words: vocab.map((v: any, i: number) => ({ id: i+1, word: v.word, hint: v.definition, difficulty: v.cefrLevel || "B1" })) };
}

export async function generateSentenceScrambleGame(text: string, analysis: any): Promise<Record<string, unknown>> {
  return llmJson(
    "You are an EFL grammar expert.",
    `Create 8 sentence scramble exercises.\nContent: ${text.slice(0,1500)}\nLevel: ${analysis.difficulty||"B1"}\nReturn JSON: {"title":"Sentence Scramble","sentences":[{"id":1,"scrambled":["is","important","English","very"],"correct":"English is very important.","hint":"Think about word order"}]}`
  );
}
