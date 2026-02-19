
alter table "public"."order_items" add column "is_out_of_stock" boolean not null default false;
