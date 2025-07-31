
const spark = 'https://raw.githubusercontent.com/OscarVsp/ArenaChampSelect/refs/heads/main/assets/spark.svg'
const trophy = 'https://raw.githubusercontent.com/OscarVsp/ArenaChampSelect/refs/heads/main/assets/trophy.svg'

const log_prefix = "[ArenaChampSelect] "
var socket;

export function init(context) {
    socket = context.socket
    console.debug(log_prefix+"init");
}

export async function load() {

    console.debug(log_prefix+"Start loading")

    const OBSERVER_CLASS = 'arena-indicator';
    const TOP1_CLASS = 'top1-indicator'
    const NEVER_PLAYED_CLASS = 'never-played-indicator'

    let challengeData = {}

    async function getArenaChallengeData() {
        console.debug(log_prefix+"Loading Arena challenge data")
        const res = await fetch('/lol-challenges/v1/challenges/local-player')
        const data = await res.json()
        const played = data["602001"]
        const top1 = data["602002"]
        return {"played": played, "top1": top1}
    }

    function updateChampsIndicator() {
        const championDivs = document.querySelectorAll('div.grid-champion');

        championDivs.forEach(champDiv => {

            if (champDiv.hasAttribute('data-id')){
                const champId = champDiv.dataset.id;

                if (
                    Number(champId) < 0 ||
                    (challengeData.played.completedIds.includes(Number(champId)) && !challengeData.top1.completedIds.includes(Number(champId)))
                ) {
                    champDiv.querySelectorAll(`.${OBSERVER_CLASS}`).forEach(el => el.remove());
                    return
                }

                const hitbox = champDiv.querySelector('.grid-champion-hitbox');
                if (!hitbox) {
                    console.error(`[ArenaChampSelect] hitbox not found for champ ${champId}`);
                    return;
                }
                
                const current_indicator = hitbox.querySelector(`.${OBSERVER_CLASS}`)
                if (current_indicator){
                    if (!challengeData.played.completedIds.includes(Number(champId)) && current_indicator.classList.contains(`${NEVER_PLAYED_CLASS}`)) {
                        return
                    } else if (challengeData.top1.completedIds.includes(Number(champId)) && current_indicator.classList.contains(`${TOP1_CLASS}`)){
                        return
                    } else {
                        current_indicator.remove()
                        console.debug(log_prefix+"Remplacing arena indicator for champion id "+champId);
                    }
                } else {
                    console.debug(log_prefix+"Adding new arena indicator for champion id "+champId);
                }

                if (challengeData.top1.completedIds.includes(Number(champId))) {
                    const overlay = document.createElement('img');
                    overlay.className = OBSERVER_CLASS;
                    overlay.classList.add(TOP1_CLASS);
                    overlay.src = trophy
                    Object.assign(overlay.style, {
                        position: 'absolute',
                        top: '-4px',
                        left: '-4px',
                        width: '14px',
                        height: '14px',
                        zIndex: '99',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 0 2px black) alpha(opacity=85)',
                        opacity: 0.9,
                    });
                    hitbox.appendChild(overlay);
                } else if (!challengeData.played.completedIds.includes(Number(champId))) {
                    const overlay = document.createElement('img');
                    overlay.className = OBSERVER_CLASS;
                    overlay.classList.add(NEVER_PLAYED_CLASS);
                    overlay.src = spark
                    Object.assign(overlay.style, {
                        position: 'absolute',
                        top: '-6px',
                        left: '-6px',
                        width: '18px',
                        height: '18px',
                        zIndex: '99',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 0 2px black) alpha(opacity=85)',
                        opacity: 0.9,
                    });
                    hitbox.appendChild(overlay);
                }
            }

        })
    }
    function clearIndicators() {
        document.querySelectorAll(`.${OBSERVER_CLASS}`).forEach(el => el.remove());
    }

    function waitAndMarkChampions() {
        const intervalTime = 40;
        var started = false

        const interval = setInterval(() => {
            try {
                const champGridReady = document.querySelector('div.grid-champion[data-id]');
                if (champGridReady) {
                    started = true
                    updateChampsIndicator()
                } else if (started){
                    console.debug(log_prefix+"Champ grid not found anymore. Clearing areana interval")
                    clearInterval(interval)
                    clearIndicators()
                } else {
                    console.debug(log_prefix+"waiting for champion grid to be available")
                }
            } catch (err) {
                console.error(log_prefix + "Error while processing champ grid:", err);
                clearInterval(interval);
                clearIndicators()
            }
        }, intervalTime);
    }

    socket.observe("/lol-champ-select/v1/session", async (data) => {
        console.debug(log_prefix+"Champ select session change detected")
        if (data["eventType"] == "Create"){
            console.debug(log_prefix+"New champ select detected")
            const res = await fetch('/lol-gameflow/v1/session', {method: 'GET',})
            const gameflowData = await res.json()

            const queue = gameflowData?.gameData?.queue;
            const queueType = queue?.gameMode || queue?.description || "Unknown Queue";
            console.debug(log_prefix+"queue type is "+queueType)

            if (queueType == "CHERRY"){// || queueType == "PRACTICETOOL"){   //TODO practicetool (only here for dev)
                console.log(log_prefix+"Arena champ select detected")
                challengeData = await getArenaChallengeData()
                waitAndMarkChampions();
            }
        }
    });

    socket.observe("/lol-lobby/v2/lobby", async (data) => {
        console.debug(log_prefix+"Lobby change detected")
        if (data["uri"] == "/lol-lobby/v2/lobby" && (data["eventType"] == "Create" || data["eventType"] == "Update") ){
            const gameConfig = data?.data?.gameConfig
            const gameMode = gameConfig?.gameMode

            if (gameMode == "CHERRY"){  
                console.log(log_prefix+"Arena Lobby detected")

                const lobbyHeader = document.querySelector('.max-level-completed');

                if (lobbyHeader == null){
                    console.debug(log_prefix+"Unable to find the lobby header content")
                    return
                }

                const malLevelText = lobbyHeader.querySelector('.max-level-completed-text')


                let existingContainer = lobbyHeader.querySelector('.arena-god-container');

                if (existingContainer != null){
                    console.debug(log_prefix+"arena god container already existing")
                    return
                }


                challengeData = await getArenaChallengeData()

                existingContainer = lobbyHeader.querySelector('.arena-god-container');

                if (existingContainer != null){
                    console.debug(log_prefix+"arena god container already existing")
                    return
                }


                console.debug(log_prefix+"Adding arena god stat to lobby header")

                //TODO: arena god achieved

                const arenaGodContainer = document.createElement("div")
                arenaGodContainer.className = "arena-god-container"
                arenaGodContainer.style.display = 'flex'
                arenaGodContainer.style.flexDirection = 'row'
                arenaGodContainer.style.alignItems = 'center'
                arenaGodContainer.style.marginLeft = 'auto'
                arenaGodContainer.style.marginRight = '10px'    
                

                const arenaGodIcon = document.createElement('img')
                arenaGodIcon.src = "/fe/lol-static-assets/images/challenges-shared/icon_reward_title.svg"
                arenaGodIcon.class="challenge-item-milestone-icon"
                arenaGodIcon.style.marginRight = '2px'
                arenaGodContainer.appendChild(arenaGodIcon)

                

                const arenaGodStat = document.createElement('div');
                arenaGodStat.id = "ArenaGodStat"
                arenaGodStat.className = "arena-god-stat"
                arenaGodStat.innerHTML = "Arena God "+challengeData.top1.completedIds.length.toString()+"/100"
                arenaGodStat.style.color = '#c8aa6e'
                arenaGodStat.style.font = malLevelText.style.font
                arenaGodStat.style.fontSize = '14px'
                arenaGodStat.style.fontWeight = '600'
                arenaGodStat.style.letterSpacing = '.025em'

                
                arenaGodContainer.appendChild(arenaGodStat)
                lobbyHeader.appendChild(arenaGodContainer);
                
            } else {
                console.debug(log_prefix+"Non-arena lobby detected")
                const existingContainer = document.querySelector('.arena-god-container');

                if (existingContainer != null){
                    console.debug(log_prefix+"removing arena god container")
                    existingContainer.remove()
                }
            }
        }
    })

    console.debug(log_prefix+"Loaded")
}

export function unload() {
    document.querySelectorAll('.my-champ-indicator').forEach(el => el.remove());
}

