create index if not exists idx_resources_published_latest
on public.resources (published_at desc, created_at desc)
where status = 'published';

create index if not exists idx_resources_published_hot
on public.resources (favorite_count desc, published_at desc, created_at desc)
where status = 'published';

create index if not exists idx_resources_published_downloads
on public.resources (download_count desc, published_at desc, created_at desc)
where status = 'published';

create index if not exists idx_resources_published_category_latest
on public.resources (category_id, published_at desc, created_at desc)
where status = 'published';

create index if not exists idx_resource_tags_tag_id_resource_id
on public.resource_tags (tag_id, resource_id);
