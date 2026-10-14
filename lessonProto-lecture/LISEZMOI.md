# Leçons de lecture pour lessonProto

Ce paquet ajoute à `lessonProto` le type de leçon « reading » et 16 leçons de lecture en français (A1 à C2).
Il contient deux versions du même changement ; utilise l’une **ou** l’autre.

## Option 1 : copier les fichiers (le plus simple)

Si ton `lessonProto` n’a pas été modifié depuis la version du 10 octobre :

    cp -R fichiers/. /chemin/vers/lessonProto/

`fichiers/` reprend l’arborescence du projet : 109 fichiers, dont 82 nouveaux et 27 qui remplacent
des fichiers existants (src/, generator/, tests/, docs/SPEC.md, Makefile, README.md…).
Attention : la copie **écrase** ces 27 fichiers ; si tu les as modifiés, utilise l’option 2.

## Option 2 : appliquer le patch (si ton lessonProto a changé)

    cd /chemin/vers/lessonProto
    patch -p1 --dry-run < /chemin/vers/lecture.patch   # vérifie d’abord
    patch -p1 < /chemin/vers/lecture.patch

Le patch ne modifie que les lignes changées ; en cas de conflit, `patch` crée des fichiers `.rej` à reprendre à la main.

## Ensuite

    make install                 # si ce n’est pas déjà fait
    make test                    # typecheck, catalogue, tests unitaires
    npx vite                     # puis http://127.0.0.1:5173/, filtre « Reading »

Spécification : `docs/reading-lessons.md` (fichiers partagés modifiés : section 9 ; questions ouvertes : section 10).
Rien n’a été commité ; le test `CLI exits nonzero…` échoue déjà sans ces changements s’il manque `.env.example` ou git.
