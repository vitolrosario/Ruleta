setTimeout(() => {
    document.getElementById("textarea-people").value = 'Pedro\nJuan\nMaria'

    var textarea_prizes = document.getElementById("textarea-prizes")
    textarea_prizes.value = 'IPhone 16\nPlay Station\nTV Samsung 55'
    textarea_prizes.dispatchEvent(new Event('input', { bubbles: true }));

    document.getElementById("show_title").click()

    var spinDuration = document.getElementById("wheel_spin_duration")
    spinDuration.value = "6"
    spinDuration.dispatchEvent(new Event('change', { bubbles: true }));
    
}, 500);

var originalPeople = []
var originalPrizes = []
var people = []
var prizes = []
var winners = []
var currentPrize = {}
var currentTextarea = null
var textarea_people = null
var isPrize = true

function start() {

    setTimeout(() => {
        var closeElem = document.getElementById("close-fullscreen")
        
        closeElem.addEventListener('click', () => {
            setTimeout(() => {
                document.getElementById("textarea-people").value = originalPeople.join("\n")

                var textarea_prizes = document.getElementById("textarea-prizes")
                textarea_prizes.value = originalPrizes.join("\n")
                textarea_prizes.dispatchEvent(new Event('input', { bubbles: true }));
                currentPrize = null
            }, 500);
        });
    }, 1000);

    if (!prizes.length) {
        textarea_people = document.getElementById("textarea-people")
        currentTextarea = document.getElementById("textarea-prizes")
        prizes = currentTextarea.value.split("\n")
        people = textarea_people.value.split("\n")
        if (!originalPeople.length) {
            originalPeople = people
            originalPrizes = prizes
        }
    } 
}

function run() {
}

function finishRun() {
    const winner = document.querySelector(".wof__wheel__winner").childNodes[0].textContent
    if (isPrize) {
        currentPrize = {prize: winner, person: null}
        prizes = prizes.filter(a => a != currentPrize.prize)
    }
    else {
        currentPrize.person = winner
        people = people.filter(a => a != currentPrize.person)
        winners.push(currentPrize)
    }

    setTimeout(() => {
        document.getElementById("close-fullscreen").click()
        setTimeout(() => {
            currentTextarea = document.getElementById("textarea-prizes")
            currentTextarea.value = isPrize ? people.join("\n") : prizes.join("\n")
            currentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                
            var title = document.getElementById("title_value")
            title.value = isPrize ? `${currentPrize.prize} para...` : ""
            title.dispatchEvent(new Event('input', { bubbles: true }));

            isPrize = !isPrize

            document.getElementById("start").click()
        }, 50);
    }, 2000);

}