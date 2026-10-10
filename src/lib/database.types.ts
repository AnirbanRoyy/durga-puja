// Hand-maintained mirror of supabase/migrations. Keep in sync when the schema changes.

export type ProgrammeType = "musical_chair" | "singing" | "dance" | "drawing" | "quiz" | "other";
export type ProgrammeStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type PerformanceStatus = "waiting" | "on_stage" | "done" | "absent";
export type SongCategory =
    "mahalaya" | "agomoni" | "dhunuchi" | "bhajan" | "modern" | "bollywood" | "other";
export type SongSource = "youtube" | "cloudinary";
export type SongPool = "music_page" | "musical_chair";
export type SongRequestStatus = "pending" | "rejected" | "added";
export type FeedbackKind = "suggestion" | "complaint" | "appreciation";
export type FeedbackStatus = "new" | "reviewed" | "resolved";

export type Edition = {
    year: number;
    name_en: string;
    name_bn: string | null;
    venue: string | null;
    mahalaya: string | null;
    shashthi: string;
    dashami: string;
    is_current: boolean;
    created_at: string;
};

export type Programme = {
    id: string;
    year: number;
    slug: string;
    type: ProgrammeType;
    title_en: string;
    title_bn: string | null;
    description_en: string | null;
    description_bn: string | null;
    rules_en: string | null;
    rules_bn: string | null;
    cover_image_url: string | null;
    venue: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: ProgrammeStatus;
    registration_open: boolean;
    voting_open: boolean;
    hide_vote_counts: boolean;
    order_locked: boolean;
    max_participants: number | null;
    admin_notes: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type Registration = {
    id: string;
    programme_id: string;
    name: string;
    sequence_no: number | null;
    performance_status: PerformanceStatus;
    created_at: string;
};

export type RegistrationContact = {
    registration_id: string;
    programme_id: string;
    phone: string;
    name_key: string;
    age: number | null;
    guardian_name: string | null;
    notes: string | null;
    edit_token_hash: string | null;
    claim_key: string | null;
};

export type Song = {
    id: string;
    title: string;
    artist: string | null;
    category: SongCategory;
    source: SongSource;
    youtube_id: string | null;
    audio_url: string | null;
    cloudinary_public_id: string | null;
    duration_sec: number | null;
    pool: SongPool;
    featured: boolean;
    active: boolean;
    sort_order: number;
    created_at: string;
};

export type SongRequest = {
    id: string;
    title: string;
    artist: string | null;
    link: string | null;
    requested_by: string | null;
    normalized_key: string;
    request_count: number;
    status: SongRequestStatus;
    song_id: string | null;
    created_at: string;
    updated_at: string;
};

export type MusicalChairRound = {
    id: string;
    programme_id: string;
    round_no: number;
    song_id: string | null;
    song_title: string | null;
    start_offset_sec: number | null;
    play_duration_sec: number | null;
    eliminated_name: string | null;
    created_at: string;
};

export type Drawing = {
    id: string;
    programme_id: string;
    child_name: string;
    age: number | null;
    title: string | null;
    image_url: string;
    cloudinary_public_id: string | null;
    width: number | null;
    height: number | null;
    vote_count: number;
    last_vote_at: string | null;
    created_at: string;
};

export type Vote = {
    id: string;
    programme_id: string;
    drawing_id: string;
    voter_hash: string;
    created_at: string;
};

export type Result = {
    id: string;
    programme_id: string;
    position: number;
    name: string;
    score: string | null;
    remark: string | null;
    created_at: string;
};

export type Feedback = {
    id: string;
    name: string | null;
    contact: string | null;
    kind: FeedbackKind;
    message: string;
    status: FeedbackStatus;
    created_at: string;
};

export type Setting = {
    key: string;
    value: unknown;
    updated_at: string;
};

export type QuizRound = {
    id: string;
    programme_id: string;
    round_no: number;
    name_en: string;
    name_bn: string | null;
    points_correct: number | null;
    points_wrong: number | null;
    status: "upcoming" | "live" | "done";
    created_at: string;
};

export type QuizQuestion = {
    id: string;
    round_id: string;
    programme_id: string;
    sort_no: number;
    kind: "team" | "audience";
    question_en: string;
    question_bn: string | null;
    state: "hidden" | "asked" | "revealed";
    team_id: string | null;
    outcome: "correct" | "wrong" | null;
    points_awarded: number | null;
    asked_at: string | null;
    revealed_at: string | null;
    revealed_answer_en: string | null;
    revealed_answer_bn: string | null;
    created_at: string;
};

export type QuizAnswer = {
    question_id: string;
    answer_en: string;
    answer_bn: string | null;
};

export type StreamRequest = {
    id: string;
    year: number;
    youtube_id: string;
    title: string;
    channel: string | null;
    thumbnail_url: string | null;
    requested_by: string;
    status: "pending" | "approved" | "rejected" | "played";
    upvotes: number;
    created_at: string;
    approved_at: string | null;
    played_at: string | null;
    play_count: number;
};

export type StreamState = {
    year: number;
    is_streaming: boolean;
    now_playing_id: string | null;
    up_next_id: string | null;
    updated_at: string;
};

export type StreamQuotaRequest = {
    id: string;
    year: number;
    ip_hash: string;
    name: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    resolved_at: string | null;
};

export type RateLimit = {
    key: string;
    window_start: string;
    count: number;
};

type Table<Row, Required extends keyof Row> = {
    Row: Row;
    Insert: Partial<Row> & Pick<Row, Required>;
    Update: Partial<Row>;
    Relationships: [];
};

export type Database = {
    public: {
        Tables: {
            editions: Table<Edition, "year" | "name_en" | "shashthi" | "dashami">;
            programmes: Table<Programme, "year" | "slug" | "type" | "title_en">;
            registrations: Table<Registration, "programme_id" | "name">;
            registration_contacts: Table<
                RegistrationContact,
                "registration_id" | "programme_id" | "phone" | "name_key"
            >;
            songs: Table<Song, "title" | "source" | "pool">;
            song_requests: Table<SongRequest, "title" | "normalized_key">;
            musical_chair_rounds: Table<MusicalChairRound, "programme_id" | "round_no">;
            drawings: Table<Drawing, "programme_id" | "child_name" | "image_url">;
            votes: Table<Vote, "programme_id" | "drawing_id" | "voter_hash">;
            results: Table<Result, "programme_id" | "position" | "name">;
            feedback: Table<Feedback, "kind" | "message">;
            settings: Table<Setting, "key" | "value">;
            rate_limits: Table<RateLimit, "key">;
            stream_requests: Table<StreamRequest, "year" | "youtube_id" | "title" | "requested_by">;
            stream_votes: Table<
                { request_id: string; voter_hash: string },
                "request_id" | "voter_hash"
            >;
            stream_state: Table<StreamState, "year">;
            stream_quota_requests: Table<StreamQuotaRequest, "year" | "ip_hash" | "name">;
            stream_request_log: Table<
                { id: string; year: number; ip_hash: string; request_id: string | null },
                "year" | "ip_hash"
            >;
            quiz_rounds: Table<QuizRound, "programme_id" | "round_no" | "name_en">;
            quiz_questions: Table<QuizQuestion, "round_id" | "programme_id" | "question_en">;
            quiz_answers: Table<QuizAnswer, "question_id" | "answer_en">;
        };
        Views: Record<never, never>;
        Functions: {
            cast_vote: {
                Args: { p_drawing_id: string; p_voter_hash: string };
                Returns: "ok" | "already_voted" | "closed" | "not_found";
            };
            request_song: {
                Args: {
                    p_title: string;
                    p_artist: string | null;
                    p_link: string | null;
                    p_requested_by: string | null;
                    p_normalized_key: string;
                };
                Returns: SongRequest;
            };
            request_stream_song: {
                Args: {
                    p_year: number;
                    p_youtube_id: string;
                    p_title: string;
                    p_channel: string | null;
                    p_thumbnail_url: string | null;
                    p_requested_by: string;
                    p_voter_hash: string;
                    p_ip_hash: string;
                    p_limit: number;
                };
                Returns:
                    | "added"
                    | "upvoted"
                    | "rerequested"
                    | "already_requested"
                    | "rejected"
                    | "limit_reached";
            };
            request_stream_quota_reset: {
                Args: { p_year: number; p_ip_hash: string; p_name: string; p_limit: number };
                Returns: "created" | "pending" | "declined" | "not_needed";
            };
            approve_stream_quota_reset: { Args: { p_request_id: string }; Returns: undefined };
            reject_stream_quota_reset: { Args: { p_request_id: string }; Returns: undefined };
            stream_requests_used: { Args: { p_year: number; p_ip_hash: string }; Returns: number };
            upvote_stream_request: {
                Args: { p_request_id: string; p_voter_hash: string };
                Returns: "ok" | "already_voted" | "closed" | "not_found";
            };
            approve_stream_request: { Args: { p_request_id: string }; Returns: undefined };
            reject_stream_request: { Args: { p_request_id: string }; Returns: undefined };
            advance_stream: { Args: { p_year: number }; Returns: undefined };
            start_stream: { Args: { p_year: number }; Returns: undefined };
            stop_stream: { Args: { p_year: number }; Returns: undefined };
            set_stream_up_next: {
                Args: { p_year: number; p_request_id: string };
                Returns: undefined;
            };
            ask_quiz_question: {
                Args: { p_question_id: string; p_team_id: string | null };
                Returns: undefined;
            };
            mark_quiz_question: {
                Args: { p_question_id: string; p_outcome: string; p_points: number | null };
                Returns: undefined;
            };
            undo_quiz_question: {
                Args: { p_question_id: string };
                Returns: undefined;
            };
            start_edition: {
                Args: {
                    p_year: number;
                    p_name_en: string;
                    p_name_bn: string | null;
                    p_venue: string | null;
                    p_mahalaya: string | null;
                    p_shashthi: string;
                    p_dashami: string;
                    p_copy_programmes: boolean;
                };
                Returns: undefined;
            };
            set_current_edition: {
                Args: { p_year: number };
                Returns: undefined;
            };
            hit_rate_limit: {
                Args: { p_key: string; p_max: number; p_window_seconds: number };
                Returns: boolean;
            };
        };
        Enums: Record<never, never>;
        CompositeTypes: Record<never, never>;
    };
};
