alter table public.familias drop constraint if exists familias_tipo_imovel_check;
update public.familias
set tipo_imovel = 'Comercio'
where lower(tipo_imovel) like 'com%rcio';
alter table public.familias
add constraint familias_tipo_imovel_check
check (tipo_imovel in ('Casa', 'Apartamento', 'Comercio', 'Outro'));

create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.vacinas_moradores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  morador_id uuid not null references public.moradores(id) on delete cascade,
  nome_vacina text not null,
  dose text not null,
  data_aplicacao date,
  data_prevista date,
  status_vacina text not null default 'pendente' check (status_vacina in ('aplicada', 'pendente', 'atrasada')),
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint vacinas_morador_unica unique (usuario_id, morador_id, nome_vacina, dose)
);

drop trigger if exists vacinas_moradores_atualizado_em on public.vacinas_moradores;
create trigger vacinas_moradores_atualizado_em
before update on public.vacinas_moradores
for each row execute function public.set_atualizado_em();

create index if not exists idx_vacinas_moradores_usuario on public.vacinas_moradores(usuario_id);
create index if not exists idx_vacinas_moradores_morador on public.vacinas_moradores(morador_id);
create index if not exists idx_vacinas_moradores_status on public.vacinas_moradores(status_vacina);

alter table public.vacinas_moradores enable row level security;

drop policy if exists "vacinas_moradores_do_usuario" on public.vacinas_moradores;
create policy "vacinas_moradores_do_usuario" on public.vacinas_moradores
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
