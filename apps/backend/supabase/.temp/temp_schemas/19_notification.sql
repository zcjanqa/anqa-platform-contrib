CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    message TEXT,
    relevance_score NUMERIC,
    message_subject TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
