# Glass Clean

Tema **Ambient Glass / glassmorphism** para Spicetify, com destaque em verde Spotify.

## Recursos

- Painéis com transparência e desfoque (sidebar, player, biblioteca)
- Fundo ambient sincronizado com a capa do álbum (ou wallpaper fixo)
- Letras com destaque e glow
- Cards com hover em vidro
- Animações suaves

## Instalação (Marketplace)

1. Abra o **Marketplace** no Spotify
2. Aba **Themes**
3. Busque **Glass Clean**
4. Clique em **Install**

## Instalação manual

1. Copie a pasta do tema para `%appdata%\spicetify\Themes\Glass`
2. No PowerShell:

```powershell
spicetify config current_theme Glass
spicetify config color_scheme base
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
spicetify apply
```

3. Feche o Spotify pelo Gerenciador de Tarefas e abra de novo.

## Após atualização do Spotify

```powershell
spicetify backup apply
spicetify apply
```

## Arquivos

| Arquivo | Função |
|---------|--------|
| `color.ini` | Esquema de cores `[base]` |
| `user.css` | Estilos glass |
| `theme.js` | Camada ambient + limpeza de fundos opacos |

## Créditos

Glass Clean — ambient glassmorphism para Spicetify.
