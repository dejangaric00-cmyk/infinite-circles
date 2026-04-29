---
title: "What I learned building my own startpage"
type: "Guide"
date: 2025-12-01
readtime: "5 min"
description: "One HTML file. No framework. No build step. On constraints, personal sites, and the quiet pleasure of making something strange."
---

I built this site because I wanted a home on the internet that looked like me — not like a template, not like a theme, not like a platform's idea of what a personal site should be.

The technical specs are almost embarrassing in their simplicity: one HTML file, vanilla JS, CSS variables, Google Fonts. No framework. No npm. No build step. For a long time I deployed it by FTP upload to a shared host. I've since moved to GitHub and Netlify, but the core is the same: one file, doing everything.

The constraints turned out to be the point.

> When you can't reach for a library, you think harder about whether you need the thing at all.

The dark mode is 40 lines of CSS. The music journal is localStorage and a handful of functions. The generative art runs on Canvas 2D, which is older than most of the frameworks people reach for when they want to make something visual. None of this is clever. It's just direct.

What I learned from building it: most web complexity is accidental. It accumulates because reaching for a library is faster than thinking, and because every dependency carries its own opinions about how things should work. Sometimes those opinions are right. Often they're just opinions.

I also learned something about what I actually want from a personal site. Not analytics. Not SEO. Not a platform for building an audience. Just a place that reflects how I think — organised loosely, updated irregularly, full of things I find genuinely interesting even if nobody else does.

The web was more interesting when people made strange, personal things and put them online without worrying about whether anyone would find them. I don't think that era is gone. I think it's just quieter now, running on subdomains and personal domains and RSS feeds that nobody subscribes to.

This site is my version of that. I don't know if anyone will read this. That's sort of the point.

If you're thinking about building something similar: start with one file. See how far you get before you feel the need to add anything. You might be surprised.
