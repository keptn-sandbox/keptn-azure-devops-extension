#! /bin/bash

changes=$(git diff --staged --name-status *Task/**/* | cut -f 2)
if [ ${#changes[@]} -eq 0 ]; then
    return 0
fi

directories=$(printf '%s\n' "${changes[@]}" | cut -f 2 | xargs -I {} dirname {}| sort -u)

task_directory_regex='^.*TaskV[0-9]+$'

for directory in ${directories}
do 
echo Examining ${directory}
task_json="${directory}/task.json"
if [[ ${directory} =~  ${task_directory_regex} ]] && !  printf '%s\n' "${changes[@]}" | grep -F -x "${task_json}"; then
    echo You are committing changes in ${directory} without changing task.json... Bumping...
    npm run task:bump ${task_json}
    git add ${task_json}
fi
done
