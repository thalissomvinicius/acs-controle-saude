create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text unique not null,
  cargo text default 'ACS',
  unidade_saude text,
  microarea text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists public.logradouros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  bairro text not null,
  nome text not null,
  tipo text not null check (tipo in ('Rua', 'Travessa', 'Avenida', 'Ramal', 'Vila', 'Outro')),
  quantidade_imoveis integer default 0 check (quantidade_imoveis >= 0),
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table if not exists public.familias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  logradouro_id uuid not null references public.logradouros(id) on delete restrict,
  numero_casa text not null,
  tipo_imovel text not null check (tipo_imovel in ('Casa', 'Apartamento', 'Comercio', 'Outro')),
  nome_familia text not null,
  responsavel_familiar text not null,
  telefone text,
  quantidade_moradores integer default 0 check (quantidade_moradores >= 0),
  situacao_moradia text,
  observacoes text,
  data_ultima_visita date,
  status_visita text default 'pendente' check (status_visita in ('em_dia', 'pendente', 'atrasada')),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table if not exists public.moradores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  familia_id uuid not null references public.familias(id) on delete cascade,
  nome_completo text not null,
  cpf text not null,
  cns text,
  nis text,
  data_nascimento date not null,
  sexo text,
  telefone text,
  peso numeric(6,2),
  altura numeric(4,2),
  responsavel_familiar boolean default false,
  participa_bolsa_familia boolean default false,
  gestante boolean default false,
  pre_natal_em_dia boolean default true,
  hipertenso boolean default false,
  diabetico boolean default false,
  usa_remedio_controlado boolean default false,
  vacina_em_dia boolean default true,
  observacoes_gerais text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint moradores_cpf_unico unique (usuario_id, cpf)
);

create table if not exists public.medicamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  morador_id uuid not null references public.moradores(id) on delete cascade,
  nome_medicamento text not null,
  uso_continuo boolean default true,
  confirmado_em date,
  observacoes text,
  criado_em timestamptz default now()
);

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

create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  familia_id uuid not null references public.familias(id) on delete cascade,
  data_visita date not null,
  acs_responsavel text not null,
  pessoas_encontradas text,
  condicoes_acompanhadas text,
  peso_atualizado numeric(6,2),
  altura_atualizada numeric(4,2),
  vacina_atualizada boolean default false,
  pre_natal_atualizado boolean default false,
  medicamento_controlado_confirmado boolean default false,
  observacoes_visita text,
  proxima_visita_recomendada date,
  status_visita text not null check (status_visita in ('concluida', 'pendente', 'retorno_necessario')),
  criado_em timestamptz default now()
);

create table if not exists public.historico_visitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  visita_id uuid references public.visitas(id) on delete set null,
  familia_id uuid not null references public.familias(id) on delete cascade,
  evento text not null,
  detalhes jsonb default '{}'::jsonb,
  criado_em timestamptz default now()
);

create table if not exists public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  dias_para_visita_atrasada integer default 30 check (dias_para_visita_atrasada > 0),
  unidade_saude text,
  microarea text,
  backup_automatico boolean default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists logradouros_atualizado_em on public.logradouros;
create trigger logradouros_atualizado_em
before update on public.logradouros
for each row execute function public.set_atualizado_em();

drop trigger if exists familias_atualizado_em on public.familias;
create trigger familias_atualizado_em
before update on public.familias
for each row execute function public.set_atualizado_em();

drop trigger if exists moradores_atualizado_em on public.moradores;
create trigger moradores_atualizado_em
before update on public.moradores
for each row execute function public.set_atualizado_em();

drop trigger if exists vacinas_moradores_atualizado_em on public.vacinas_moradores;
create trigger vacinas_moradores_atualizado_em
before update on public.vacinas_moradores
for each row execute function public.set_atualizado_em();

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em
before update on public.configuracoes
for each row execute function public.set_atualizado_em();

create or replace function public.atualizar_familia_apos_visita()
returns trigger as $$
begin
  update public.familias
  set
    data_ultima_visita = new.data_visita,
    status_visita = case
      when new.status_visita = 'concluida' then 'em_dia'
      else 'pendente'
    end
  where id = new.familia_id;

  insert into public.historico_visitas (usuario_id, visita_id, familia_id, evento, detalhes)
  values (
    new.usuario_id,
    new.id,
    new.familia_id,
    'visita_registrada',
    jsonb_build_object('status', new.status_visita, 'data', new.data_visita)
  );

  return new;
end;
$$ language plpgsql;

drop trigger if exists visitas_atualizar_familia on public.visitas;
create trigger visitas_atualizar_familia
after insert on public.visitas
for each row execute function public.atualizar_familia_apos_visita();

create index if not exists idx_logradouros_usuario on public.logradouros(usuario_id);
create index if not exists idx_familias_usuario on public.familias(usuario_id);
create index if not exists idx_familias_logradouro on public.familias(logradouro_id);
create index if not exists idx_familias_status on public.familias(status_visita);
create index if not exists idx_moradores_usuario on public.moradores(usuario_id);
create index if not exists idx_moradores_familia on public.moradores(familia_id);
create index if not exists idx_moradores_cpf on public.moradores(cpf);
create index if not exists idx_vacinas_moradores_usuario on public.vacinas_moradores(usuario_id);
create index if not exists idx_vacinas_moradores_morador on public.vacinas_moradores(morador_id);
create index if not exists idx_vacinas_moradores_status on public.vacinas_moradores(status_vacina);
create index if not exists idx_visitas_usuario on public.visitas(usuario_id);
create index if not exists idx_visitas_familia on public.visitas(familia_id);
create index if not exists idx_visitas_data on public.visitas(data_visita);

alter table public.usuarios enable row level security;
alter table public.logradouros enable row level security;
alter table public.familias enable row level security;
alter table public.moradores enable row level security;
alter table public.medicamentos enable row level security;
alter table public.vacinas_moradores enable row level security;
alter table public.visitas enable row level security;
alter table public.historico_visitas enable row level security;
alter table public.configuracoes enable row level security;

create policy "usuarios_acessam_proprio_perfil" on public.usuarios
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "logradouros_do_usuario" on public.logradouros
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "familias_do_usuario" on public.familias
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "moradores_do_usuario" on public.moradores
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "medicamentos_do_usuario" on public.medicamentos
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "vacinas_moradores_do_usuario" on public.vacinas_moradores
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "visitas_do_usuario" on public.visitas
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "historico_do_usuario" on public.historico_visitas
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "configuracoes_do_usuario" on public.configuracoes
for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
