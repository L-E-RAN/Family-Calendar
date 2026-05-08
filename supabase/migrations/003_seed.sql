-- ============================================================
-- SEED DATA — Development only
-- Run this after creating auth users in Supabase dashboard
-- ============================================================

-- NOTE: Replace UUIDs below with real auth.users UUIDs after creating them
-- This seed creates the family structure and mock data

-- Family
insert into families (id, name, timezone) values
  ('00000000-0000-0000-0000-000000000001', 'משפחת אשואל', 'Asia/Jerusalem')
on conflict do nothing;

-- Children (2 active + 1 future inactive)
insert into children (id, family_id, name, color, active, school_name) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'ילד א', '#6366f1', true, 'בית ספר יסודי'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'ילד ב', '#f59e0b', true, 'בית ספר יסודי'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'ילד ג (עתידי)', '#10b981', false, null)
on conflict do nothing;

-- Mock local tasks
insert into calendar_items (
  id, family_id, child_id, source_provider, source_type,
  dedupe_key, title, description, due_at, all_day, status,
  priority, visibility, is_editable
) values
  (
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'local', 'task',
    'local:task:seed-1',
    'לסדר את החדר',
    'לסדר ולנקות את חדר השינה',
    now() + interval '1 day',
    true, 'active', 'normal', 'family', true
  ),
  (
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0000-000000000001',
    null,
    'local', 'task',
    'local:task:seed-2',
    'קניות שבועיות',
    null,
    now() + interval '2 days',
    true, 'active', 'high', 'family', true
  ),
  (
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',
    'local', 'task',
    'local:task:seed-3',
    'אימון כדורסל',
    'אל תשכח ציוד ספורט',
    now() + interval '3 days',
    false, 'active', 'normal', 'family', true
  )
on conflict (dedupe_key) do nothing;

-- Mock Google Calendar events
insert into calendar_items (
  id, family_id, source_provider, source_type,
  dedupe_key, title, description, starts_at, ends_at,
  all_day, status, visibility, is_editable, color, external_id
) values
  (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'google_calendar', 'event',
    'google_calendar:mock:cal1:event1',
    'ארוחת שבת משפחתית',
    'ארוחת שבת אצל סבא וסבתא',
    date_trunc('week', now()) + interval '5 days' + interval '18 hours',
    date_trunc('week', now()) + interval '5 days' + interval '21 hours',
    false, 'active', 'family', true, '#4285f4', 'mock-event-1'
  ),
  (
    '00000000-0000-0000-0003-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'google_calendar', 'event',
    'google_calendar:mock:cal1:event2',
    'ביקור רופא',
    null,
    now() + interval '5 days' + interval '10 hours',
    now() + interval '5 days' + interval '11 hours',
    false, 'active', 'parents_only', true, '#4285f4', 'mock-event-2'
  )
on conflict (dedupe_key) do nothing;

-- Mock Mashov homework
insert into calendar_items (
  id, family_id, child_id, source_provider, source_type,
  dedupe_key, title, description, due_at, subject, teacher,
  all_day, status, visibility, is_editable, color
) values
  (
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'homework',
    'mashov_homework:student1:hw-1',
    'תרגיל מתמטיקה עמ'' 45-46',
    'לפתור תרגילים 1-10 בעמוד 45 ו-46',
    now() + interval '1 day',
    'מתמטיקה', 'רחל כהן',
    true, 'active', 'family', false, '#6366f1'
  ),
  (
    '00000000-0000-0000-0004-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'homework',
    'mashov_homework:student1:hw-2',
    'קריאת פרק בספר',
    'לקרוא פרק 5 ולענות על שאלות הבנה',
    now() + interval '2 days',
    'ספרות', 'דוד לוי',
    true, 'active', 'family', false, '#6366f1'
  ),
  (
    '00000000-0000-0000-0004-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',
    'mashov', 'homework',
    'mashov_homework:student2:hw-1',
    'עבודה באנגלית',
    'לכתוב פסקה על הנושא שנבחר',
    now() + interval '3 days',
    'אנגלית', 'שרה גרין',
    true, 'active', 'family', false, '#f59e0b'
  )
on conflict (dedupe_key) do nothing;

-- Mock Mashov timetable lessons (today)
insert into calendar_items (
  id, family_id, child_id, source_provider, source_type,
  dedupe_key, title, subject, teacher, location,
  starts_at, ends_at, all_day, status, visibility, is_editable, color
) values
  (
    '00000000-0000-0000-0005-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'lesson',
    'mashov_lesson:student1:' || to_char(now(), 'YYYY-MM-DD') || ':1:מתמטיקה:רחל כהן',
    'מתמטיקה - שעור 1',
    'מתמטיקה', 'רחל כהן', 'כיתה 4',
    date_trunc('day', now()) + interval '8 hours',
    date_trunc('day', now()) + interval '8 hours 45 minutes',
    false, 'active', 'family', false, '#6366f1'
  ),
  (
    '00000000-0000-0000-0005-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'lesson',
    'mashov_lesson:student1:' || to_char(now(), 'YYYY-MM-DD') || ':2:עברית:יוסי מזרחי',
    'עברית - שעור 2',
    'עברית', 'יוסי מזרחי', 'כיתה 4',
    date_trunc('day', now()) + interval '9 hours',
    date_trunc('day', now()) + interval '9 hours 45 minutes',
    false, 'active', 'family', false, '#6366f1'
  ),
  (
    '00000000-0000-0000-0005-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',
    'mashov', 'lesson',
    'mashov_lesson:student2:' || to_char(now(), 'YYYY-MM-DD') || ':1:אנגלית:שרה גרין',
    'אנגלית - שעור 1',
    'אנגלית', 'שרה גרין', 'כיתה 6',
    date_trunc('day', now()) + interval '8 hours',
    date_trunc('day', now()) + interval '8 hours 45 minutes',
    false, 'active', 'family', false, '#f59e0b'
  )
on conflict (dedupe_key) do nothing;

-- Mock exam
insert into calendar_items (
  id, family_id, child_id, source_provider, source_type,
  dedupe_key, title, description, starts_at, subject, teacher,
  all_day, status, visibility, is_editable, color
) values
  (
    '00000000-0000-0000-0006-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'exam',
    'mashov_exam:student1:exam-1',
    'מבחן מתמטיקה',
    'פרקים 3-5 - מספרים שלמים ושברים',
    now() + interval '7 days' + interval '9 hours',
    'מתמטיקה', 'רחל כהן',
    false, 'needs_action', 'family', false, '#ef4444'
  )
on conflict (dedupe_key) do nothing;

-- Mock parent approval
insert into calendar_items (
  id, family_id, child_id, source_provider, source_type,
  dedupe_key, title, description, starts_at, ends_at,
  all_day, status, visibility, is_editable, color
) values
  (
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'mashov', 'parent_approval',
    'mashov_parent_approval:student1:trip-1',
    'טיול שנתי לירושלים',
    'אנא אשרו השתתפות ילדכם בטיול השנתי לירושלים ביום חמישי הקרוב',
    now() + interval '4 days' + interval '7 hours',
    now() + interval '4 days' + interval '15 hours',
    false, 'needs_action', 'parents_only', false, '#f97316'
  )
on conflict (dedupe_key) do nothing;
