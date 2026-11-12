import { Paragraph, ScriptDocument, BeatCard, FlowLine, OutlineLane, OutlineMarker, TitlePage } from '../types/script';

export type TemplateCategory =
  | 'Film'
  | 'Television'
  | 'Theater & Audio'
  | 'Graphic & Immersive'
  | 'Prose & Outline'
  | 'Micro Drama'
  | 'Structural Guides'
  | 'Custom';

export interface ScreenplayTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  badge?: string;
  targetPages: number;
  initialTitlePage: Partial<TitlePage>;
  sampleParagraphs: { type: Paragraph['type']; text: string; characterExtension?: string }[];
  starterBeats?: BeatCard[];
  starterFlowLines?: FlowLine[];
  starterLanes?: OutlineLane[];
  starterMarkers?: OutlineMarker[];
  structureSummary?: string[];
  isCustom?: boolean;
}

export const BUILTIN_TEMPLATES: ScreenplayTemplate[] = [
  // 1. Feature Screenplay
  {
    id: 'feature-screenplay',
    name: 'Feature Screenplay',
    category: 'Film',
    description: 'The global standard for 90-120 minute theatrical motion picture screenplays. Conforms to Academy, WGA, and studio specs.',
    badge: 'Industry Standard',
    targetPages: 110,
    initialTitlePage: {
      title: 'THE UNTITLED FEATURE',
      author: 'SCREENWRITER NAME',
      basedOn: '',
      draftDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      contact: 'Agency / Management\nPhone: (555) 019-2834\nEmail: contact@agency.com',
      copyright: `Copyright © ${new Date().getFullYear()} - All Rights Reserved`,
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'EXT. LOS ANGELES - DOWNTOWN ROOFTOP - NIGHT' },
      { type: 'Action', text: 'Rain pelts the cracked asphalt. Neon billboards bleed crimson and violet into the oily puddles below. A heavy silence hangs in the damp air.' },
      { type: 'Action', text: 'MARCUS VANCE (38) stands at the precipice, trench coat clinging to his frame like a shroud. He clutches an encrypted glass datapad.' },
      { type: 'Character', text: 'MARCUS' },
      { type: 'Parenthetical', text: '(into comms collar)' },
      { type: 'Dialogue', text: "The drop is burned. Pack the crates and burn the warehouse. We've got less than three minutes before air support arrives." },
      { type: 'Character', text: 'ELENA' },
      { type: 'Parenthetical', text: '(filtered over comm)' },
      { type: 'Dialogue', text: "You can't jump from the eastern tower, Marcus. The slipstream will shred the parachute." },
      { type: 'Character', text: 'MARCUS' },
      { type: 'Dialogue', text: "Then watch me improvise." },
      { type: 'Transition', text: 'SMASH CUT TO:' },
    ],
    structureSummary: [
      'Act I: Setup & Catalyst (pp. 1-25)',
      'Plot Point 1: Crossing the Threshold (pp. 25-30)',
      'Act II-A: Fun & Games, Rising Stakes (pp. 30-55)',
      'Midpoint: False Victory / False Defeat (pp. 55-60)',
      'Act II-B: Bad Guys Close In & All Hope Lost (pp. 60-85)',
      'Act III: Climax, Final Confrontation & Resolution (pp. 85-110)',
    ],
  },

  // 2. Short Screenplay
  {
    id: 'short-screenplay',
    name: 'Short Screenplay',
    category: 'Film',
    description: 'Optimized for film festival submissions, indie shorts, and portfolio showcases (5-20 pages). Focused premise, tight character count.',
    badge: 'Festivals',
    targetPages: 15,
    initialTitlePage: {
      title: 'A BRIEF ENCOUNTER',
      author: 'FILMMAKER NAME',
      basedOn: 'Original Story',
      draftDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      contact: 'Filmmaker Direct: filmmaker@domain.com',
      copyright: `Copyright © ${new Date().getFullYear()}`,
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'INT. ALL-NIGHT DINER - BOOTH - 3:00 AM' },
      { type: 'Action', text: 'Fluorescent tubes buzz like angry hornets. Coffee drips into a glass decanter behind the counter with methodical precision.' },
      { type: 'Action', text: 'SOPHIE (24) methodically tears a paper sugar packet into geometric halves. Across from her, DANIEL (27) stares at his untouched black coffee.' },
      { type: 'Character', text: 'SOPHIE' },
      { type: 'Dialogue', text: "You took the red-eye out of Chicago just to say this in person?" },
      { type: 'Character', text: 'DANIEL' },
      { type: 'Dialogue', text: "A phone call didn't feel cowardly enough." },
      { type: 'Character', text: 'SOPHIE' },
      { type: 'Parenthetical', text: '(a wry smile)' },
      { type: 'Dialogue', text: "At least you're honest about your cowardice." },
    ],
    structureSummary: [
      'Beginning: Establish immediate tension and objective (pp. 1-3)',
      'Middle: Twist, reversal, or escalation of stakes (pp. 4-10)',
      'Ending: Resonance, punchline, or poignant realization (pp. 11-15)',
    ],
  },

  // 3. Screenplay for Beginners
  {
    id: 'screenplay-beginners',
    name: 'Screenplay for Beginners',
    category: 'Film',
    description: 'Includes contextual margin prompts, element formatting tips, slugline cheat sheets, and starter scene architecture.',
    badge: 'Educational',
    targetPages: 90,
    initialTitlePage: {
      title: 'MY FIRST SCREENPLAY',
      author: 'ASPIRING WRITER',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'My Email: writer@sample.com',
      copyright: 'WGA East/West Registered',
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'INT. APARTMENT LIVING ROOM - DAY' },
      { type: 'Action', text: '[TIP: Action lines describe ONLY what the audience can see and hear. Keep descriptions present tense, visual, and lean.]' },
      { type: 'Action', text: 'MAYA sits cross-legged on the rug, surrounded by stacks of moving boxes marked "FRAGILE". She opens an old cedar jewelry box.' },
      { type: 'Character', text: 'MAYA' },
      { type: 'Parenthetical', text: '(whispering to herself)' },
      { type: 'Dialogue', text: "[TIP: Dialogue reveals conflict, subtext, or intention. Avoid on-the-nose exposition!] What did you hide in here, Grandpa?" },
      { type: 'Transition', text: 'CUT TO:' },
    ],
    structureSummary: [
      'Sluglines always start with INT. or EXT., followed by Location and Time of Day.',
      'Character names are capitalized above dialogue and centered.',
      'One page of screenplay roughly equals one minute of screen time.',
    ],
  },

  // 4. Easy-Write
  {
    id: 'easy-write',
    name: 'Easy-Write',
    category: 'Film',
    description: 'Streamlined, low-friction creative flow template with smart autotype assistance, uncluttered layout, and minimal rules for fast drafting.',
    badge: 'Fast Flow',
    targetPages: 100,
    initialTitlePage: {
      title: 'FAST DRAFT WORKSPACE',
      author: 'CREATOR',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'EXT. OPEN HIGHWAY - SUNSET' },
      { type: 'Action', text: 'A vintage black convertible tears down the asphalt toward the bleeding horizon. Radio blares static-drenched rock and roll.' },
      { type: 'Character', text: 'DRIVER' },
      { type: 'Dialogue', text: "Never looking back." },
    ],
  },

  // 5. Single-Camera Television
  {
    id: 'single-camera-tv',
    name: 'Single-Camera Television',
    category: 'Television',
    description: 'Prestige 1-Hour drama / 30-Min streaming comedy format with industry standard Act breaks: TEASER, ACT ONE, ACT TWO, ACT THREE, ACT FOUR, and TAG.',
    badge: 'Prestige Drama / HBO',
    targetPages: 58,
    initialTitlePage: {
      title: 'PILOT: "THE CORRIDOR"',
      author: 'SHOWRUNNER NAME',
      basedOn: 'Original Television Series',
      draftDate: new Date().toLocaleDateString(),
      contact: 'United Talent / WME Representation',
      copyright: `© ${new Date().getFullYear()} Studio Productions`,
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'TEASER' },
      { type: 'Scene Heading', text: 'INT. SUBWAY CAR #408 - MOVING - NIGHT' },
      { type: 'Action', text: 'The fluorescent tubes flicker in unison with the rhythmic clatter of metal wheels. Five exhausted commuters sway in the gloom.' },
      { type: 'Action', text: 'DET. CALLUM REID (45) stands braced against the center pole. Blood drips from his right knuckle onto his leather coat.' },
      { type: 'Character', text: 'CALLUM' },
      { type: 'Parenthetical', text: '(to Dispatcher)' },
      { type: 'Dialogue', text: "Ten-twenty on the express track. The suspect didn't board alone." },
      { type: 'End of Act', text: 'END OF TEASER' },
      { type: 'New Act', text: 'ACT ONE' },
      { type: 'Scene Heading', text: 'INT. 14TH PRECINCT - BULLPEN - MORNING' },
      { type: 'Action', text: 'Coffee stench, ringing desk phones, printers humming. The chaos of a homicide squad at sunrise.' },
    ],
    structureSummary: [
      'Teaser: 3-5 pages hooking the audience',
      'Act One: 10-12 pages establishing the episode case & personal arcs',
      'Act Two: 10-12 pages complicating investigations and escalating conflict',
      'Act Three: 10-12 pages lowest point / false confession / climax',
      'Act Four: 8-10 pages resolution and cliffhanger hook',
    ],
  },

  // 6. Multi-Camera Television
  {
    id: 'multi-camera-tv',
    name: 'Multi-Camera Television',
    category: 'Television',
    description: 'Traditional taped-live multicam sitcom format (Friends, Big Bang Theory). Double-spaced dialogue, capitalized character action, and tape audience cues.',
    badge: 'Network Sitcom',
    targetPages: 44,
    initialTitlePage: {
      title: 'THE ROOMMATES - EPISODE #101',
      author: 'SITCOM WRITING TEAM',
      basedOn: '',
      draftDate: `TABLE READ DRAFT - ${new Date().toLocaleDateString()}`,
      contact: 'Production Office / Stage 12',
      copyright: 'Warner Bros. Television',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT ONE' },
      { type: 'New Act', text: 'SCENE A' },
      { type: 'Scene Heading', text: 'INT. APARTMENT - DAY (DAY 1)' },
      { type: 'Action', text: '(LUCY, JACK, NEIGHBOR BOB)' },
      { type: 'Action', text: 'LUCY IS ROOTING FRANTICALLY THROUGH THE REFRIGERATOR, TOSSING HEADS OF LETTUCE BEHIND HER ONTO THE COUNTER.' },
      { type: 'Action', text: 'JACK ENTERS THROUGH THE FRONT DOOR, BALANCING THREE OVERSIZED PIZZA BOXES.' },
      { type: 'Character', text: 'JACK' },
      { type: 'Dialogue', text: "GOOD NEWS: I FOUND EXTRA PARMESAN. BAD NEWS: THE DELIVERY GUY NOW THINKS WE'RE RUNNING AN ILLEGAL GAMBLING RING." },
      { type: 'Action', text: '(AUDIENCE LAUGHS)' },
      { type: 'Character', text: 'LUCY' },
      { type: 'Dialogue', text: "JACK! WHERE IS THE WEDDING CAKE TOPPER? IF IT'S IN THE FREEZER AGAIN, I'M CALLING YOUR MOTHER!" },
    ],
    structureSummary: [
      'Scene letters (SCENE A, SCENE B) for each stage setup',
      'Character cast list placed at top of each scene',
      'All action lines formatted in FULL CAPITALS',
      'Commercial breaks clearly delineated by Act headings',
    ],
  },

  // 7. Single-Cam for Beginners
  {
    id: 'single-cam-beginners',
    name: 'Single-Cam for Beginners',
    category: 'Television',
    description: 'Educational guide for writing half-hour or one-hour streaming episodes. Explains A-story, B-story, and C-story weaving with examples.',
    badge: 'TV Writing Guide',
    targetPages: 35,
    initialTitlePage: {
      title: 'WRITING THE HALF-HOUR COMEDY',
      author: 'STUDENT WRITER',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'INT. TECH STARTUP - OPEN OFFICE - DAY' },
      { type: 'Action', text: '[A-STORY SETUP: Our protagonist faces their main occupational goal of the week.]' },
      { type: 'Action', text: 'OMAR (29) frantically types on three stacked monitors while wearing noise-canceling headphones.' },
      { type: 'Character', text: 'OMAR' },
      { type: 'Dialogue', text: "If this algorithm crashes before the VC demo, I'm moving to a goat farm in Idaho." },
    ],
  },

  // 8. Multi-Cam for Beginners
  {
    id: 'multi-cam-beginners',
    name: 'Multi-Cam for Beginners',
    category: 'Television',
    description: 'Step-by-step primer on writing classic sitcom scripts for tape night, multi-camera blocking, and audience reaction timing.',
    badge: 'Tape Night Guide',
    targetPages: 40,
    initialTitlePage: {
      title: 'MULTICAM 101',
      author: 'WRITERS ROOM',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT ONE - SCENE 1' },
      { type: 'Scene Heading', text: 'INT. DINER - COUNTER - MORNING' },
      { type: 'Action', text: 'GARY SLAMS A MASSIVE STACK OF PANCAKES ONTO THE COUNTER.' },
      { type: 'Character', text: 'GARY' },
      { type: 'Dialogue', text: "ONE ORDER OF BUTTERMILK DELIGHT, EXTRA BUTTER, NO REGRETS!" },
    ],
  },

  // 9. Stage Play
  {
    id: 'stage-play',
    name: 'Stage Play',
    category: 'Theater & Audio',
    description: 'Conforms to Dramatists Guild standards for contemporary theater, off-Broadway, and West End productions. Centered character names with indented stage directions.',
    badge: 'Dramatists Guild',
    targetPages: 80,
    initialTitlePage: {
      title: 'THE GLASS OBSERVATORY',
      author: 'PLAYWRIGHT NAME',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Playwrights Agency\nNew York, NY',
      copyright: 'Dramatists Guild Member',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT I' },
      { type: 'New Act', text: 'SCENE 1' },
      { type: 'Scene Heading', text: 'AT RISE: A DUSTY ATTIC LABORATORY' },
      { type: 'Action', text: 'Moonlight streams through an arched skylight. A vintage brass telescope aims upward through the fractured glass. A clock ticks steadily offstage.' },
      { type: 'Action', text: 'ELEANOR sits at a cluttered drafting table. She is holding a sealed wax letter, hesitating to break the seal.' },
      { type: 'Character', text: 'ELEANOR' },
      { type: 'Parenthetical', text: '(softly, to the quiet room)' },
      { type: 'Dialogue', text: "Thirty years of waiting, and the answer comes in an ordinary postmark." },
      { type: 'Action', text: 'ARTHUR enters from the spiral stairwell, carrying a kerosene lamp.' },
      { type: 'Character', text: 'ARTHUR' },
      { type: 'Dialogue', text: "Did the courier reach the gates before the fog set in?" },
      { type: 'Character', text: 'ELEANOR' },
      { type: 'Dialogue', text: "He did. It's from Cambridge." },
    ],
    structureSummary: [
      'Act I: The World, The Secret & The Arrival (pp. 1-40)',
      'Intermission (15 minutes in theatrical staging)',
      'Act II: The Confrontation, Unraveling & Catharsis (pp. 41-80)',
    ],
  },

  // 10. Comics
  {
    id: 'comics-script',
    name: 'Comics',
    category: 'Graphic & Immersive',
    description: 'Modern 22-page comic book script format with PAGE, PANEL, CAPTION, BALLOON, and SFX conventions for pencilers and letterers.',
    badge: 'Sequential Art',
    targetPages: 22,
    initialTitlePage: {
      title: 'CHRONO-PUNK #1',
      author: 'WRITER NAME',
      basedOn: 'Original Comic Property',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Editorial Submissions',
      copyright: 'Creator-Owned Comic',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'PAGE ONE (FIVE PANELS)' },
      { type: 'Outline Level 1', text: 'PANEL 1' },
      { type: 'Action', text: 'WIDE SPLASH ACROSS TOP. Neo-Tokyo skyline drenched in toxic amber rain. Holographic koi fish swim between cybernetic spires.' },
      { type: 'Character', text: 'CAPTION' },
      { type: 'Dialogue', text: "They said time travel was impossible. They just lacked sufficient wattage." },
      { type: 'Outline Level 1', text: 'PANEL 2' },
      { type: 'Action', text: 'CLOSE UP on KIRA (19), goggles reflecting electric arc sparks. She adjusts a heavy wrench.' },
      { type: 'Character', text: 'KIRA' },
      { type: 'Dialogue', text: "Hold your breath, Sparks. This is gonna sting." },
      { type: 'Character', text: 'SFX' },
      { type: 'Dialogue', text: "KZZZZ-THOOOOM!" },
    ],
    structureSummary: [
      'Standard 20-24 page monthly issue format',
      'Panel descriptions specify visual camera angles and lighting for the artist',
      'Dialogue, Balloons, Captions, and Sound Effects (SFX) clearly designated for the letterer',
    ],
  },

  // 11. Graphic Novels
  {
    id: 'graphic-novels',
    name: 'Graphic Novels',
    category: 'Graphic & Immersive',
    description: 'Extended multi-chapter graphic novel layout with splash pages, spread layouts, and visual pacing breakdowns for long-form visual narratives.',
    badge: 'Long-Form Visual',
    targetPages: 120,
    initialTitlePage: {
      title: 'THE SLEEPING MOUNTAIN',
      author: 'GRAPHIC NOVELIST',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Literary Agent / Graphic Novels',
      copyright: 'All Rights Reserved',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'CHAPTER ONE: THE EXILE' },
      { type: 'Outline Level 1', text: 'PAGE 1 - DOUBLE PAGE SPREAD (PANEL 1-3)' },
      { type: 'Action', text: 'An ancient pine forest under heavy winter snowfall. A single traveler leads a pack ox across an icy ridge.' },
      { type: 'Character', text: 'NARRATOR' },
      { type: 'Dialogue', text: "Before the fire gods spoke, there was only the singing of the frost." },
    ],
  },

  // 12. Immersive Storytelling
  {
    id: 'immersive-storytelling',
    name: 'Immersive Storytelling',
    category: 'Graphic & Immersive',
    description: 'Designed for VR/XR experiences, video game branching dialogue, spatial audio environments, interactive installations, and 360 cinematic narratives.',
    badge: 'XR & Video Games',
    targetPages: 50,
    initialTitlePage: {
      title: 'PROJECT AETHERIA (VR EXPERIENCE)',
      author: 'NARRATIVE DESIGNER',
      basedOn: 'Interactive Spatial Experience',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Studio Narrative Lead',
      copyright: 'Game Studio Interactive LLC',
    },
    sampleParagraphs: [
      { type: 'Scene Heading', text: 'ZONE: THE FORGOTTEN ORRERY - 360 SPATIAL ENVIRONMENT' },
      { type: 'Action', text: '[PLAYER POV: Seated in center of revolving celestial sphere. Brass gears rotate at 12 RPM.]' },
      { type: 'Action', text: '[AUDIO SPATIALIZATION: Distant chimes from azimuth 45 degrees, low rumble at sub-bass 30Hz.]' },
      { type: 'Character', text: 'AI GUIDE (V.O.)' },
      { type: 'Parenthetical', text: '(spatial audio: floating above player)' },
      { type: 'Dialogue', text: "Welcome traveler. Touch the golden ring to synchronize the orbit." },
      { type: 'Outline Level 1', text: 'CHOICE NODE A: PLAYER TOUCHES RING' },
      { type: 'Action', text: 'The celestial sphere accelerates. Constellations ignite in bright cyan light.' },
      { type: 'Outline Level 1', text: 'CHOICE NODE B: PLAYER REJECTS INTERACTION' },
      { type: 'Action', text: 'The sphere groans to a halt. Ambient lighting drops to deep navy.' },
    ],
  },

  // 13. General Text
  {
    id: 'general-text',
    name: 'General Text',
    category: 'Prose & Outline',
    description: 'Clean, unformatted text environment for unconstrained brainstorming, character monologues, voice-over transcripts, and free writing.',
    badge: 'Freeform',
    targetPages: 30,
    initialTitlePage: {
      title: 'CREATIVE WORKBENCH',
      author: 'WRITER',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'General', text: 'Session Notes & Creative Brainstorming:' },
      { type: 'General', text: 'The story explores what happens when a seasoned detective realizes that every clue left at the scene was intentionally directed at his own past mistakes.' },
      { type: 'General', text: 'Key themes: Redemption, legacy, the price of silence in a corrupt organization.' },
    ],
  },

  // 14. Manuscript
  {
    id: 'manuscript',
    name: 'Manuscript',
    category: 'Prose & Outline',
    description: 'Standard literary novel submission layout with chapter breaks, paragraph indentation, standard word pacing, and publisher submission typography.',
    badge: 'Novels & Fiction',
    targetPages: 300,
    initialTitlePage: {
      title: 'THE CHRONICLES OF WINTER',
      author: 'NOVELIST NAME',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Literary Representation\nWord Count: Approx. 85,000 words',
      copyright: 'All Rights Reserved',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'CHAPTER ONE' },
      { type: 'Action', text: 'The train did not stop at Blackwood Station unless someone flagged the engineer with a kerosene lantern from the edge of the abandoned grain elevator. Thomas had stood in the sleet for forty minutes before the iron locomotive screeched along the frozen rails.' },
      { type: 'Action', text: 'He carried nothing but a cardboard valise and the grandfather clock key his uncle had mailed him six days before dying.' },
    ],
  },

  // 15. Short Story
  {
    id: 'short-story',
    name: 'Short Story',
    category: 'Prose & Outline',
    description: 'Format for literary journals, anthology submissions, and short fiction contests (2,000 - 8,000 words).',
    badge: 'Literary Journals',
    targetPages: 25,
    initialTitlePage: {
      title: 'THE LAST LIGHTHOUSE KEEPER',
      author: 'WRITER',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Submissions Contact',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Action', text: 'The storm was three hours old when the radio died.' },
      { type: 'Action', text: 'Samuel sat at the zinc kitchen table, listening to the ocean throw itself against eighty feet of granite. In seventy years, the Atlantic had never sounded this hungry.' },
    ],
  },

  // 16. Prose Outline
  {
    id: 'prose-outline',
    name: 'Prose Outline',
    category: 'Prose & Outline',
    description: 'Treatment and narrative outline format. Clean paragraph summaries of every sequence with character beats and thematic intentions.',
    badge: 'Studio Pitch Treatment',
    targetPages: 12,
    initialTitlePage: {
      title: 'PROJECT TITAN: STORY TREATMENT',
      author: 'WRITER / PRODUCER',
      basedOn: 'Original Concept',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Production Development',
      copyright: 'Confidential Treatment',
    },
    sampleParagraphs: [
      { type: 'Outline Level 1', text: 'ACT I: THE HOOK & THE INCITING INCIDENT' },
      { type: 'Action', text: 'We open in the heart of the Mojave Desert where an experimental geothermal facility detects unexpected seismic tremors. Lead seismologist DR. CLARA REYES discovers the tremors match no known tectonic pattern.' },
      { type: 'Outline Level 1', text: 'ACT II: THE EXPEDITION & DISCOVERY' },
      { type: 'Action', text: 'Clara teams up with retired engineer HANK to penetrate the subterranean tunnels before private military contractors seal the perimeter.' },
    ],
  },

  // 17. Micro Drama
  {
    id: 'micro-drama',
    name: 'Micro Drama',
    category: 'Micro Drama',
    description: 'Fast-paced short-form drama formatted for mobile viewing (60-90 second episodes). Hook in first 3 seconds, continuous cliffhangers, high melodrama.',
    badge: '60s Episodes',
    targetPages: 2,
    initialTitlePage: {
      title: 'BILLIONAIRE HEIR IN DISGUISE',
      author: 'MICRO DRAMA CREATOR',
      basedOn: 'Vertical Series (Season 1)',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Digital Series Studio',
      copyright: 'Mobile Drama Rights',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'EPISODE 1: THE WEDDING INTRUDER (60 SECONDS)' },
      { type: 'Scene Heading', text: 'INT. LUXURY HOTEL BALLROOM - DAY' },
      { type: 'Action', text: '[HOOK - SECOND 0 TO 5: A champagne glass shatters on the marble floor. Music stops instantly.]' },
      { type: 'Action', text: 'AMBER (22), in a designer bridal gown, slaps a leather folder across the GROOM’S chest.' },
      { type: 'Character', text: 'AMBER' },
      { type: 'Dialogue', text: "You thought I didn't know? Your company went bankrupt yesterday! This wedding is off!" },
      { type: 'Action', text: 'From the back of the room, JANITOR LEO (26) quietly steps forward, pulling off his grease-stained cap to reveal sharp, commanding eyes.' },
      { type: 'Character', text: 'LEO' },
      { type: 'Dialogue', text: "Then marry me instead. And I'll buy your family's debt in cash." },
      { type: 'Transition', text: '[CLIFFHANGER CUT: TO BE CONTINUED]' },
    ],
  },

  // 18. ReelShort / Vertical Drama Formatting
  {
    id: 'reelshort-vertical',
    name: 'ReelShort / Vertical Drama',
    category: 'Micro Drama',
    description: 'Optimized vertical aspect ratio (9:16) script structure for viral mobile apps (ReelShort, DramaBox, ShortMax). Micro-beats, high emotion, instant stakes.',
    badge: '9:16 Mobile Viral',
    targetPages: 10,
    initialTitlePage: {
      title: 'REVENGE OF THE FORGOTTEN CEO',
      author: 'VERTICAL DRAMA WRITER',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: 'Mobile Production Dept',
      copyright: 'Digital Rights 2026',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'EPISODE 01: THE HUMILIATION' },
      { type: 'Scene Heading', text: 'INT. GRAND CHARITY GALA - NIGHT (VERTICAL FRAME)' },
      { type: 'Action', text: '[CAMERA: TIGHT VERTICAL CLOSE-UP ON CLARA’S WEEPING FACE]' },
      { type: 'Character', text: 'CLARA' },
      { type: 'Dialogue', text: "Three years as your silent wife... and this is how you repay me?" },
      { type: 'Action', text: '[SWIPE TRANSITION TO EPISODE 02]' },
    ],
  },

  // 19. Acts and Sequences (4 Acts)
  {
    id: 'acts-and-sequences-4acts',
    name: 'Acts and Sequences (4 Acts)',
    category: 'Structural Guides',
    description: 'The proven 8-Sequence method dividing the 4 dramatic acts into 12-15 minute narrative units. Balances plot velocity and character transformation.',
    badge: '8-Sequence Framework',
    targetPages: 110,
    initialTitlePage: {
      title: 'THE 8-SEQUENCE FEATURE',
      author: 'SCREENWRITER',
      basedOn: 'Sequence Architecture',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT I (PAGES 1-30)' },
      { type: 'Outline Level 1', text: 'SEQUENCE A: STATUS QUO & INCITING INCIDENT (PP. 1-15)' },
      { type: 'Action', text: 'Establish the protagonist in their flawed ordinary world. Introduce the central desire and the disruption that makes return impossible.' },
      { type: 'Outline Level 1', text: 'SEQUENCE B: PREDICAMENT & CROSSING THE THRESHOLD (PP. 15-30)' },
      { type: 'Action', text: 'Protagonist attempts to resolve the disruption with old habits. Fails. Makes the active choice to enter the new arena (Lock-In).' },
      { type: 'New Act', text: 'ACT II-A (PAGES 30-60)' },
      { type: 'Outline Level 1', text: 'SEQUENCE C: FIRST OBSTACLES & ALLIES (PP. 30-45)' },
      { type: 'Outline Level 1', text: 'SEQUENCE D: RISING STAKES & THE MIDPOINT SHIFT (PP. 45-60)' },
    ],
    structureSummary: [
      'Seq A: Introduction & Inciting Event (pp. 1-15)',
      'Seq B: Struggle & Plot Point 1 Lock-In (pp. 15-30)',
      'Seq C: First Successes & Rising Opposition (pp. 30-45)',
      'Seq D: The Midpoint Shift & False Climax (pp. 45-60)',
      'Seq E: Bad Guys Close In & Repercussions (pp. 60-75)',
      'Seq F: The Dark Night of the Soul / All Hope Lost (pp. 75-90)',
      'Seq G: Gathering Forces & Climax Part 1 (pp. 90-100)',
      'Seq H: Climax Part 2 & New Equilibrium (pp. 100-110)',
    ],
  },

  // STRUCTURAL GUIDES
  // Three-Act Structure
  {
    id: 'structure-three-act',
    name: 'Three-Act Structure Guide',
    category: 'Structural Guides',
    description: 'Aristotle and Syd Field classical dramatic paradigm: Beginning, Middle, and End calibrated with dramatic milestones and page markers.',
    badge: 'Classical Dramatic',
    targetPages: 110,
    initialTitlePage: {
      title: 'THREE-ACT DRAMATIC STRUCTURE',
      author: 'STUDIO PARADIGM',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT I: SETUP (PAGES 1 - 30)' },
      { type: 'Outline Level 1', text: 'PP. 1-10: THE ORDINARY WORLD & CHARACTER FLAW' },
      { type: 'Outline Level 1', text: 'P. 12: THE INCITING INCIDENT / CATALYST' },
      { type: 'Outline Level 1', text: 'PP. 25-30: PLOT POINT 1 - LOCK-IN / BREAK INTO TWO' },
      { type: 'New Act', text: 'ACT II: CONFRONTATION (PAGES 30 - 85)' },
      { type: 'Outline Level 1', text: 'P. 55: THE MIDPOINT - STAKES RAISED / POINT OF NO RETURN' },
      { type: 'Outline Level 1', text: 'P. 75: ALL IS LOST / DARK NIGHT OF THE SOUL' },
      { type: 'Outline Level 1', text: 'P. 85: PLOT POINT 2 - BREAK INTO THREE' },
      { type: 'New Act', text: 'ACT III: RESOLUTION (PAGES 85 - 110)' },
      { type: 'Outline Level 1', text: 'PP. 95-105: THE CLIMAX' },
      { type: 'Outline Level 1', text: 'PP. 105-110: THE DÉNOUEMENT & NEW NORMAL' },
    ],
  },

  // Four-Act Structure
  {
    id: 'structure-four-act',
    name: 'Four-Act Structure Guide',
    category: 'Structural Guides',
    description: 'Divides the sprawling second act into two equal 25-page quadrants (Act 2A and Act 2B) pivoting around a dramatic Midpoint reversal.',
    badge: 'Quadrant Balancing',
    targetPages: 100,
    initialTitlePage: {
      title: 'FOUR-ACT QUADRANT TEMPLATE',
      author: '',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT 1: THE PROBLEM (PAGES 1-25)' },
      { type: 'Action', text: 'Ordinary World -> Disruptive Event -> Commitment to Action.' },
      { type: 'New Act', text: 'ACT 2A: THE RESPONSE (PAGES 26-50)' },
      { type: 'Action', text: 'Reactive exploration, early encounters with the antagonist, building to the MIDPOINT.' },
      { type: 'New Act', text: 'ACT 2B: THE ATTACK (PAGES 51-75)' },
      { type: 'Action', text: 'Active assault by the protagonist, opposing forces regroup, leading to the LOWEST EBB.' },
      { type: 'New Act', text: 'ACT 3: THE RESOLUTION (PAGES 76-100)' },
      { type: 'Action', text: 'Final plan, decisive battle, transformation demonstrated.' },
    ],
  },

  // Five-Act Structure
  {
    id: 'structure-five-act',
    name: 'Five-Act Structure (Freytag / Prestige TV)',
    category: 'Structural Guides',
    description: 'Gustav Freytag pyramid used in classic Shakespearean tragedies and adopted by modern premium serialized television (Succession, Breaking Bad).',
    badge: 'Shakespearean / Prestige',
    targetPages: 60,
    initialTitlePage: {
      title: 'FIVE-ACT PRESTIGE PARADIGM',
      author: '',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'New Act', text: 'ACT I: EXPOSITION & THE SPARK' },
      { type: 'Action', text: 'The society’s rules, the protagonist’s fatal hubris (hamartia), the fateful decision.' },
      { type: 'New Act', text: 'ACT II: RISING ACTION & COMPLICATIONS' },
      { type: 'Action', text: 'The net tightens. Rival factions clash. Inescapable momentum builds.' },
      { type: 'New Act', text: 'ACT III: THE CLIMAX (PERIPETEIA)' },
      { type: 'Action', text: 'The decisive reversal of fortune. What was hidden is revealed.' },
      { type: 'New Act', text: 'ACT IV: FALLING ACTION (SPIRAL)' },
      { type: 'Action', text: 'Unintended consequences compound. The tragic hero realizes the trap of their own making.' },
      { type: 'New Act', text: 'ACT V: CATASTROPHE & DÉNOUEMENT' },
      { type: 'Action', text: 'The inevitable reckoning. Catharsis for the audience.' },
    ],
  },

  // Character Arc Outline
  {
    id: 'structure-character-arc',
    name: 'Character Arc Outline',
    category: 'Structural Guides',
    description: 'Psychological progression tracking the protagonist from Lie Believed to Truth Realized through Want vs. Need conflict.',
    badge: 'Inner Journey',
    targetPages: 105,
    initialTitlePage: {
      title: 'INTERNAL TRANSFORMATION BLUEPRINT',
      author: '',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Outline Level 1', text: '1. THE WOUND / GHOST FROM THE PAST' },
      { type: 'Action', text: 'The formative trauma that formed the protagonist’s emotional defense mechanism.' },
      { type: 'Outline Level 1', text: '2. THE LIE BELIEVED ABOUT THEMSELVES OR THE WORLD' },
      { type: 'Action', text: 'The false belief they cling to in order to feel safe (e.g., "I don’t need anyone").' },
      { type: 'Outline Level 1', text: '3. WANT (EXTERNAL GOAL) VS. NEED (SPIRITUAL TRUTH)' },
      { type: 'Action', text: 'They chase their Want, unaware that only their Need can heal them.' },
      { type: 'Outline Level 1', text: '4. THE CRUCIBLE / MOMENT OF TRUTH' },
      { type: 'Action', text: 'Forced to abandon the Lie to save what they truly love.' },
      { type: 'Outline Level 1', text: '5. THE REBORN IDENTITY' },
      { type: 'Action', text: 'Living in accordance with the Truth.' },
    ],
  },

  // Sequence-Based Outlining
  {
    id: 'structure-sequence-based',
    name: 'Sequence-Based Outlining',
    category: 'Structural Guides',
    description: 'Frank Daniel USC cinematic sequence method: 8 complete mini-movies with their own setups, tensions, and cliffhanger resolutions.',
    badge: 'USC / Frank Daniel',
    targetPages: 110,
    initialTitlePage: {
      title: 'THE 8-SEQUENCE CINEMATIC BREAKDOWN',
      author: '',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Outline Level 1', text: 'SEQUENCE 1: THE WORLD AS IT IS & THE RUPTURE' },
      { type: 'Outline Level 1', text: 'SEQUENCE 2: EMBARKING ON THE QUEST' },
      { type: 'Outline Level 1', text: 'SEQUENCE 3: ENTERING UNCHARTED TERRITORY' },
      { type: 'Outline Level 1', text: 'SEQUENCE 4: REACHING THE SUMMIT (MIDPOINT)' },
      { type: 'Outline Level 1', text: 'SEQUENCE 5: THE SHADOW’S COUNTERATTACK' },
      { type: 'Outline Level 1', text: 'SEQUENCE 6: ROCK BOTTOM & THE EMBERS OF HOPE' },
      { type: 'Outline Level 1', text: 'SEQUENCE 7: STORMING THE FORTRESS' },
      { type: 'Outline Level 1', text: 'SEQUENCE 8: THE RETURN & THE LESSON' },
    ],
  },

  // Story Circle
  {
    id: 'structure-story-circle',
    name: 'Story Circle (Dan Harmon 8-Step)',
    category: 'Structural Guides',
    description: 'Dan Harmon modern circular adaptation of Joseph Campbell’s Hero’s Journey: You, Need, Go, Search, Find, Take, Return, Changed.',
    badge: 'Dan Harmon Circle',
    targetPages: 30,
    initialTitlePage: {
      title: 'THE STORY CIRCLE',
      author: '',
      basedOn: '',
      draftDate: new Date().toLocaleDateString(),
      contact: '',
      copyright: '',
    },
    sampleParagraphs: [
      { type: 'Outline Level 1', text: '1. YOU: A character is in a zone of comfort...' },
      { type: 'Outline Level 1', text: '2. NEED: But they want something...' },
      { type: 'Outline Level 1', text: '3. GO: They enter an unfamiliar situation...' },
      { type: 'Outline Level 1', text: '4. SEARCH: Adapt to it...' },
      { type: 'Outline Level 1', text: '5. FIND: Get what they wanted...' },
      { type: 'Outline Level 1', text: '6. TAKE: Pay a heavy price for it...' },
      { type: 'Outline Level 1', text: '7. RETURN: And go back to where they started...' },
      { type: 'Outline Level 1', text: '8. CHANGED: Having changed.' },
    ],
  },
];

const USER_TEMPLATES_KEY = 'fd13_user_custom_templates';

export const getUserTemplates = (): ScreenplayTemplate[] => {
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load user templates', e);
    return [];
  }
};

export const saveUserTemplate = (template: ScreenplayTemplate): void => {
  const current = getUserTemplates().filter((t) => t.id !== template.id);
  current.unshift({ ...template, isCustom: true, category: 'Custom' });
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(current));
};

export const deleteUserTemplate = (id: string): void => {
  const current = getUserTemplates().filter((t) => t.id !== id);
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(current));
};

export const getAllTemplates = (): ScreenplayTemplate[] => {
  return [...getUserTemplates(), ...BUILTIN_TEMPLATES];
};

export const getTemplateById = (id: string): ScreenplayTemplate | undefined => {
  return getAllTemplates().find((t) => t.id === id);
};

export const createDocumentFromTemplate = (template: ScreenplayTemplate): ScriptDocument => {
  const now = new Date().toISOString();
  const paragraphs: Paragraph[] = template.sampleParagraphs.map((p, idx) => ({
    id: `para-tmpl-${idx + 1}-${Date.now()}`,
    type: p.type,
    text: p.text,
    characterExtension: p.characterExtension,
  }));

  const initialTitlePage: TitlePage = {
    title: template.initialTitlePage?.title || 'UNTITLED SCRIPT',
    author: template.initialTitlePage?.author || 'WRITER NAME',
    screenplayBy: template.initialTitlePage?.screenplayBy || '',
    storyBy: template.initialTitlePage?.storyBy || '',
    basedOn: template.initialTitlePage?.basedOn || '',
    additionalCredits: template.initialTitlePage?.additionalCredits || '',
    draftDate: template.initialTitlePage?.draftDate || new Date().toLocaleDateString(),
    contact: template.initialTitlePage?.contact || '',
    copyright: template.initialTitlePage?.copyright || `Copyright © ${new Date().getFullYear()}`,
    customNotes: template.initialTitlePage?.customNotes || '',
    includeInPdf: true,
  };

  return {
    id: `doc-${Date.now()}`,
    titlePage: initialTitlePage,
    paragraphs,
    currentRevision: 'White',
    productionMode: false,
    lockedPages: false,
    beats: template.starterBeats || [],
    flowLines: template.starterFlowLines || [],
    outlineLanes: template.starterLanes || [],
    outlineMarkers: template.starterMarkers || [],
    targetScriptPages: template.targetPages,
    showStructureLines: true,
    sceneNumberPlacement: 'both',
    showScriptNotes: true,
    showBookmarks: true,
    showSceneComments: true,
    activeAuthor: 'Lead Writer',
    themeMode: 'light',
    scriptViewMode: 'normal',
    typewriterMode: false,
    headerFooterConfig: {
      showHeader: true,
      showFooter: false,
      firstPageHasHeader: false,
      firstPageHasFooter: false,
      header: {
        left: '',
        center: '',
        right: '{PAGE}.',
      },
      footer: {
        left: '',
        center: '',
        right: '',
      },
      customLabel: '',
      dateFormat: 'Month DD, YYYY',
    },
    appliedTemplateId: template.id,
    lastSavedAt: now,
  };
};
