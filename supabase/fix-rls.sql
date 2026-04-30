-- Execute este arquivo no SQL Editor do Supabase se algum cadastro retornar:
-- "new row violates row-level security policy".

alter table public.usuarios enable row level security;
alter table public.logradouros enable row level security;
alter table public.familias enable row level security;
alter table public.moradores enable row level security;
alter table public.medicamentos enable row level security;
alter table public.visitas enable row level security;
alter table public.historico_visitas enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "usuarios_acessam_proprio_perfil" on public.usuarios;
drop policy if exists "logradouros_do_usuario" on public.logradouros;
drop policy if exists "familias_do_usuario" on public.familias;
drop policy if exists "moradores_do_usuario" on public.moradores;
drop policy if exists "medicamentos_do_usuario" on public.medicamentos;
drop policy if exists "visitas_do_usuario" on public.visitas;
drop policy if exists "historico_do_usuario" on public.historico_visitas;
drop policy if exists "configuracoes_do_usuario" on public.configuracoes;

create policy "usuarios_acessam_proprio_perfil" on public.usuarios
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "logradouros_do_usuario" on public.logradouros
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "familias_do_usuario" on public.familias
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "moradores_do_usuario" on public.moradores
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "medicamentos_do_usuario" on public.medicamentos
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "visitas_do_usuario" on public.visitas
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "historico_do_usuario" on public.historico_visitas
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "configuracoes_do_usuario" on public.configuracoes
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);
