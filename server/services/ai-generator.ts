import { invokeLLM } from "../_core/llm";

export interface VideoAnalysis {
  title: string;
  mainTopics: string[];
  cefrLevel: string;
  keyVocabulary: VocabItem[];
  grammarPoints: string[];
  summary: string;
  themes: string[];
}

export interface VocabItem {
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  polishTranslation: string;
  cefrLevel: string;
}

export interface WorksheetContent {
  title: string;
  beforeWatching: { type: string; instruction: string; items: any[] }[];
  whileWatching: { type: string; instruction: string; items: any[] }[];
  afterWatching: { type: string; instruction: string; items: any[] }[];
}

export interface GrammarGuideContent {
  title: string;
  grammarPoints: {
    name: string;
    explanation: string;
    examples: string[];
    exercises: { instruction: string; items: any[] }[];
  }[];
}

export interface LessonPlanContent {
  title: string;
  level: string;
  duration: string;
  objectives: string[];
  materials: string[];
  stages: {
    name: string;
    duration: string;
    activity: string;
    teacherNotes: string;
  }[];
  homework: string;
  differentiation: { stronger: string; weaker: string };
}

export interface QuizConfig {
  title: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
}

export interface MemoryGameConfig {
  title: string;
  pairs: { id: number; front: string; back: string }[];
}

export interface MatchingGameConfig {
  title: string;
  pairs: { id: number; left: string; right: string }[];
}

export interface FillBlanksConfig {
  title: string;
  sentences: {
    id: number;
    text: string; // use ___ for blank
    answer: string;
    options: string[];
  }[];
}

export interface SpellingBeeConfig {
  title: string;
  words: { id: number; word: string; hint: string; difficulty: string }[];
}

export interface SentenceScrambleConfig {
  title: string;
  sentences: { id: number; scrambled: string[]; correct: string; hint: string }[];
}

/**
 * Analyze video transcript and extract educational content
 */
export async function analyzeTranscript(
  transcript: string,
  videoTitle: string
): Promise<VideoAnalysis> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert EFL/ESL curriculum designer. Analyze the given YouTube video transcript and extract educational content for English teachers. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Analyze this transcript from "${videoTitle}" and return JSON with this exact structure:
{
  "title": "descriptive lesson title",
  "mainTopics": ["topic1", "topic2", "topic3"],
  "cefrLevel": "B1",
  "keyVocabulary": [
    {
      "word": "example",
      "partOfSpeech": "noun",
      "definition": "clear definition",
      "exampleSentence": "sentence from or inspired by the video",
      "polishTranslation": "przykład",
      "cefrLevel": "B1"
    }
  ],
  "grammarPoints": ["Present Perfect", "Passive Voice"],
  "summary": "2-3 sentence summary of the video content",
  "themes": ["technology", "environment"]
}

Include 15-20 key vocabulary items. Focus on words that are useful for English learners.

TRANSCRIPT:
${transcript.substring(0, 4000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as VideoAnalysis;
}

/**
 * Generate comprehensive worksheet
 */
export async function generateWorksheet(
  transcript: string,
  analysis: VideoAnalysis
): Promise<WorksheetContent> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert EFL worksheet designer. Create engaging, pedagogically sound worksheets. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a comprehensive worksheet for level ${analysis.cefrLevel} students based on this video about: ${analysis.summary}

Return JSON:
{
  "title": "Worksheet title",
  "beforeWatching": [
    {
      "type": "vocabulary_preview",
      "instruction": "Match the words to their definitions",
      "items": [{"word": "...", "definition": "..."}]
    },
    {
      "type": "prediction",
      "instruction": "What do you think the video is about? Write 3 predictions.",
      "items": []
    }
  ],
  "whileWatching": [
    {
      "type": "true_false",
      "instruction": "Are these statements True (T) or False (F)?",
      "items": [{"statement": "...", "answer": "T"}]
    },
    {
      "type": "gap_fill",
      "instruction": "Fill in the gaps while watching",
      "items": [{"sentence": "The speaker says that ___ is important.", "answer": "..."}]
    }
  ],
  "afterWatching": [
    {
      "type": "comprehension_questions",
      "instruction": "Answer these questions in full sentences.",
      "items": [{"question": "...", "model_answer": "..."}]
    },
    {
      "type": "discussion",
      "instruction": "Discuss with a partner:",
      "items": [{"question": "..."}]
    },
    {
      "type": "writing_task",
      "instruction": "Write a short paragraph (100-150 words):",
      "items": [{"prompt": "..."}]
    }
  ]
}

Topics: ${analysis.mainTopics.join(", ")}
Key vocabulary: ${analysis.keyVocabulary.slice(0, 10).map(v => v.word).join(", ")}

TRANSCRIPT EXCERPT:
${transcript.substring(0, 3000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as WorksheetContent;
}

/**
 * Generate grammar guide
 */
export async function generateGrammarGuide(
  transcript: string,
  analysis: VideoAnalysis
): Promise<GrammarGuideContent> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert EFL grammar teacher. Create clear, example-rich grammar guides. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a grammar guide for level ${analysis.cefrLevel} based on grammar points found in this video.

Grammar points to cover: ${analysis.grammarPoints.join(", ")}

Return JSON:
{
  "title": "Grammar Guide: [topic]",
  "grammarPoints": [
    {
      "name": "Present Perfect",
      "explanation": "We use the Present Perfect to...",
      "examples": ["I have seen this video.", "She has never been to London."],
      "exercises": [
        {
          "instruction": "Complete the sentences with the correct form",
          "items": [{"sentence": "I ___ (never/see) such a beautiful place.", "answer": "have never seen"}]
        }
      ]
    }
  ]
}

TRANSCRIPT EXCERPT:
${transcript.substring(0, 2000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as GrammarGuideContent;
}

/**
 * Generate full lesson plan
 */
export async function generateLessonPlan(
  analysis: VideoAnalysis,
  videoTitle: string
): Promise<LessonPlanContent> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an experienced EFL teacher trainer. Create detailed, practical lesson plans. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a 60-minute lesson plan for level ${analysis.cefrLevel} using the YouTube video "${videoTitle}".

Video summary: ${analysis.summary}
Topics: ${analysis.mainTopics.join(", ")}
Grammar points: ${analysis.grammarPoints.join(", ")}

Return JSON:
{
  "title": "Lesson title",
  "level": "${analysis.cefrLevel}",
  "duration": "60 minutes",
  "objectives": ["Students will be able to...", "Students will practise..."],
  "materials": ["YouTube video", "Worksheet", "Whiteboard"],
  "stages": [
    {
      "name": "Warmer",
      "duration": "5 min",
      "activity": "Detailed description of what teacher and students do",
      "teacherNotes": "Tips for the teacher"
    },
    {
      "name": "Pre-teaching vocabulary",
      "duration": "10 min",
      "activity": "...",
      "teacherNotes": "..."
    },
    {
      "name": "First viewing",
      "duration": "10 min",
      "activity": "...",
      "teacherNotes": "..."
    },
    {
      "name": "Second viewing",
      "duration": "10 min",
      "activity": "...",
      "teacherNotes": "..."
    },
    {
      "name": "Language focus",
      "duration": "10 min",
      "activity": "...",
      "teacherNotes": "..."
    },
    {
      "name": "Speaking/Writing task",
      "duration": "10 min",
      "activity": "...",
      "teacherNotes": "..."
    },
    {
      "name": "Feedback and wrap-up",
      "duration": "5 min",
      "activity": "...",
      "teacherNotes": "..."
    }
  ],
  "homework": "Detailed homework task",
  "differentiation": {
    "stronger": "Extension activities for stronger students",
    "weaker": "Support strategies for weaker students"
  }
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as LessonPlanContent;
}

/**
 * Generate mini textbook chapter
 */
export async function generateMiniTextbook(
  transcript: string,
  analysis: VideoAnalysis
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL textbook author. Create engaging, structured textbook chapters. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a mini textbook chapter for level ${analysis.cefrLevel} based on this video content.

Summary: ${analysis.summary}
Topics: ${analysis.mainTopics.join(", ")}

Return JSON:
{
  "title": "Chapter title",
  "unitTitle": "Unit: [theme]",
  "introduction": "Engaging intro paragraph that hooks students",
  "readingPassage": {
    "title": "Reading passage title",
    "text": "A 200-250 word reading passage inspired by the video content, written at ${analysis.cefrLevel} level",
    "glossary": [{"word": "...", "definition": "..."}]
  },
  "comprehensionQuestions": [
    {"type": "literal", "question": "...", "answer": "..."},
    {"type": "inferential", "question": "...", "answer": "..."}
  ],
  "vocabularySection": {
    "title": "Key Vocabulary",
    "words": [{"word": "...", "definition": "...", "example": "...", "polish": "..."}]
  },
  "grammarBox": {
    "title": "Grammar Focus",
    "rule": "...",
    "examples": ["..."],
    "practice": [{"sentence": "...", "answer": "..."}]
  },
  "speakingActivity": {
    "title": "Let's Talk!",
    "instruction": "...",
    "questions": ["..."]
  },
  "writingTask": {
    "title": "Writing Task",
    "instruction": "...",
    "wordCount": "150-200 words",
    "tips": ["..."]
  }
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

/**
 * Generate writing exercises
 */
export async function generateWritingExercises(
  analysis: VideoAnalysis
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL writing skills expert. Create varied, scaffolded writing exercises. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create writing exercises for level ${analysis.cefrLevel} based on the topic: ${analysis.summary}

Return JSON:
{
  "title": "Writing Skills: [topic]",
  "exercises": [
    {
      "type": "guided_paragraph",
      "title": "Guided Paragraph Writing",
      "instruction": "...",
      "scaffold": "Topic sentence: ___\\nSupporting idea 1: ___\\nSupporting idea 2: ___\\nConclusion: ___",
      "wordCount": "80-100 words",
      "model": "Model paragraph example..."
    },
    {
      "type": "opinion_essay",
      "title": "Opinion Essay",
      "instruction": "...",
      "prompt": "...",
      "wordCount": "150-200 words",
      "usefulLanguage": ["In my opinion...", "I believe that...", "On the other hand..."]
    },
    {
      "type": "email",
      "title": "Email Writing",
      "instruction": "Write an email to a friend about what you learned from the video",
      "prompt": "...",
      "wordCount": "100-120 words",
      "format": ["Greeting", "Opening line", "Main content", "Closing"]
    },
    {
      "type": "summary",
      "title": "Summary Writing",
      "instruction": "Summarise the main points of the video in your own words",
      "wordCount": "100-150 words",
      "tips": ["Use your own words", "Include the main ideas only", "Use linking words"]
    }
  ]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

/**
 * Generate listening comprehension tasks
 */
export async function generateListeningComprehension(
  transcript: string,
  analysis: VideoAnalysis
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL listening skills expert. Create authentic listening tasks. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create listening comprehension tasks for level ${analysis.cefrLevel}.

Video summary: ${analysis.summary}
Key vocabulary: ${analysis.keyVocabulary.slice(0, 8).map(v => v.word).join(", ")}

Return JSON:
{
  "title": "Listening Comprehension: [topic]",
  "preListening": {
    "title": "Before You Listen",
    "tasks": [
      {"type": "prediction", "instruction": "Look at the title and predict: what will the video be about?", "items": []},
      {"type": "vocabulary", "instruction": "Check you know these words before listening", "items": [{"word": "...", "definition": "..."}]}
    ]
  },
  "firstListening": {
    "title": "First Listening — General Understanding",
    "instruction": "Watch the video once and answer these general questions",
    "tasks": [
      {"type": "gist", "question": "What is the main topic of the video?", "answer": "..."},
      {"type": "multiple_choice", "question": "The speaker's main message is...", "options": ["A...", "B...", "C...", "D..."], "answer": "A"}
    ]
  },
  "secondListening": {
    "title": "Second Listening — Detailed Understanding",
    "instruction": "Watch again and complete these tasks",
    "tasks": [
      {"type": "note_taking", "instruction": "Complete the notes", "items": [{"label": "Main point 1:", "answer": "..."}]},
      {"type": "true_false_justify", "instruction": "True, False or Not Given? Justify your answer.", "items": [{"statement": "...", "answer": "True", "justification": "..."}]}
    ]
  },
  "postListening": {
    "title": "After Listening",
    "tasks": [
      {"type": "discussion", "questions": ["...", "..."]},
      {"type": "reflection", "instruction": "What was the most interesting thing you learned?"}
    ]
  }
}

TRANSCRIPT:
${transcript.substring(0, 2000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

/**
 * Generate discussion questions
 */
export async function generateDiscussionQuestions(
  analysis: VideoAnalysis
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL speaking skills expert. Create thought-provoking discussion questions. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create discussion questions for level ${analysis.cefrLevel} based on: ${analysis.summary}

Return JSON:
{
  "title": "Discussion & Speaking Activities",
  "warmUp": [{"question": "...", "tip": "Personal connection question"}],
  "comprehension": [{"question": "...", "tip": "Check understanding"}],
  "analysis": [{"question": "...", "tip": "Deeper thinking"}],
  "opinion": [{"question": "...", "tip": "Express and justify opinions"}],
  "debate": {
    "motion": "This house believes that...",
    "forArguments": ["..."],
    "againstArguments": ["..."]
  },
  "rolePlay": {
    "scenario": "...",
    "roles": [{"role": "...", "instructions": "..."}]
  },
  "usefulLanguage": {
    "agreeing": ["I completely agree...", "That's a good point..."],
    "disagreeing": ["I'm not sure about that...", "I see it differently..."],
    "giving_opinions": ["In my opinion...", "From my perspective..."]
  }
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

/**
 * Generate homework assignment
 */
export async function generateHomework(
  analysis: VideoAnalysis,
  videoTitle: string
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL teacher. Create meaningful, varied homework assignments. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create homework assignments for level ${analysis.cefrLevel} students who watched "${videoTitle}".

Return JSON:
{
  "title": "Homework Assignment",
  "dueDate": "Next lesson",
  "tasks": [
    {
      "number": 1,
      "type": "vocabulary",
      "title": "Vocabulary Practice",
      "instruction": "...",
      "details": "...",
      "timeEstimate": "15 minutes"
    },
    {
      "number": 2,
      "type": "writing",
      "title": "Writing Task",
      "instruction": "...",
      "wordCount": "100-150 words",
      "timeEstimate": "20 minutes"
    },
    {
      "number": 3,
      "type": "research",
      "title": "Research Task",
      "instruction": "...",
      "timeEstimate": "15 minutes"
    }
  ],
  "bonusTask": {
    "title": "Bonus Challenge",
    "instruction": "...",
    "reward": "Extra points!"
  }
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

/**
 * Generate teacher notes
 */
export async function generateTeacherNotes(
  analysis: VideoAnalysis,
  videoTitle: string
): Promise<Record<string, unknown>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior EFL teacher trainer. Create comprehensive teacher notes. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create teacher notes for "${videoTitle}" at level ${analysis.cefrLevel}.

Return JSON:
{
  "title": "Teacher Notes",
  "backgroundInfo": "Background information about the topic for the teacher",
  "culturalNotes": ["Cultural context point 1", "Cultural context point 2"],
  "languageFocus": {
    "vocabulary": [{"word": "...", "notes": "Teaching tips for this word"}],
    "grammar": [{"point": "...", "commonErrors": ["..."], "tips": "..."}]
  },
  "classroomManagement": ["Tip 1", "Tip 2"],
  "differentiation": {
    "earlyFinishers": ["Activity 1", "Activity 2"],
    "supportStrategies": ["Strategy 1", "Strategy 2"],
    "extensionActivities": ["Extension 1", "Extension 2"]
  },
  "assessmentIdeas": ["Formative assessment idea 1", "Summative assessment idea"],
  "crossCurricularLinks": ["Subject 1: connection", "Subject 2: connection"],
  "onlineResources": ["Suggested resource 1", "Suggested resource 2"]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string));
}

// ============ GAME GENERATORS ============

/**
 * Generate quiz game
 */
export async function generateQuiz(
  transcript: string,
  analysis: VideoAnalysis
): Promise<QuizConfig> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL quiz designer. Create engaging multiple-choice quizzes. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create a 10-question multiple choice quiz for level ${analysis.cefrLevel} based on this video.

Return JSON:
{
  "title": "Video Quiz: [topic]",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Include mix of: comprehension questions, vocabulary questions, grammar questions.
correct field is 0-indexed (0=A, 1=B, 2=C, 3=D).

TRANSCRIPT:
${transcript.substring(0, 2000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as QuizConfig;
}

/**
 * Generate memory game pairs
 */
export async function generateMemoryGame(
  analysis: VideoAnalysis
): Promise<MemoryGameConfig> {
  const pairs = analysis.keyVocabulary.slice(0, 12).map((v, i) => ({
    id: i + 1,
    front: v.word,
    back: v.definition,
  }));

  return {
    title: `Vocabulary Memory Game`,
    pairs,
  };
}

/**
 * Generate matching game
 */
export async function generateMatchingGame(
  analysis: VideoAnalysis
): Promise<MatchingGameConfig> {
  const pairs = analysis.keyVocabulary.slice(0, 10).map((v, i) => ({
    id: i + 1,
    left: v.word,
    right: v.definition,
  }));

  return {
    title: `Word Matching Challenge`,
    pairs,
  };
}

/**
 * Generate fill-in-the-blanks game
 */
export async function generateFillBlanks(
  transcript: string,
  analysis: VideoAnalysis
): Promise<FillBlanksConfig> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL game designer. Create fill-in-the-blank exercises. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create 8 fill-in-the-blank sentences for level ${analysis.cefrLevel} based on the video content.

Return JSON:
{
  "title": "Fill in the Blanks",
  "sentences": [
    {
      "id": 1,
      "text": "The speaker explains that ___ is very important for our daily lives.",
      "answer": "technology",
      "options": ["technology", "music", "sport", "cooking"]
    }
  ]
}

Use key vocabulary: ${analysis.keyVocabulary.slice(0, 8).map(v => v.word).join(", ")}

TRANSCRIPT:
${transcript.substring(0, 1500)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as FillBlanksConfig;
}

/**
 * Generate spelling bee game
 */
export async function generateSpellingBee(
  analysis: VideoAnalysis
): Promise<SpellingBeeConfig> {
  const words = analysis.keyVocabulary.map((v, i) => ({
    id: i + 1,
    word: v.word,
    hint: v.definition,
    difficulty: v.cefrLevel || analysis.cefrLevel,
  }));

  return {
    title: `Spelling Bee Challenge`,
    words,
  };
}

/**
 * Generate sentence scramble game
 */
export async function generateSentenceScramble(
  analysis: VideoAnalysis
): Promise<SentenceScrambleConfig> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an EFL game designer. Create sentence scramble exercises. Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Create 8 sentence scramble exercises for level ${analysis.cefrLevel}.

Return JSON:
{
  "title": "Sentence Scramble",
  "sentences": [
    {
      "id": 1,
      "scrambled": ["important", "is", "very", "Learning", "English"],
      "correct": "Learning English is very important",
      "hint": "Think about subject + verb + complement"
    }
  ]
}

Use vocabulary: ${analysis.keyVocabulary.slice(0, 8).map(v => v.word).join(", ")}
Topics: ${analysis.mainTopics.join(", ")}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse((response.choices[0].message.content as string)) as SentenceScrambleConfig;
}
