-- Notes can belong directly to a course (topic optional) so any course -
-- even one without topics - can hold its own notes, and deleting a course
-- deletes its notes along with its roadmap and topics (FK cascade).

alter table public.notes
  add column course_id bigint references public.courses (id) on delete cascade;

-- Backfill: notes linked through a topic inherit that topic's course.
update public.notes n
set course_id = ct.course_id
from public.course_topics ct
where n.topic_id = ct.id
  and n.course_id is null
  and ct.course_id is not null;

create index if not exists notes_course_id_idx on public.notes (course_id)
  where course_id is not null;
