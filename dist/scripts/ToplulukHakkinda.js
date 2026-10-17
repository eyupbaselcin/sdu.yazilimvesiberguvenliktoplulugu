window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                }
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.team-filter');
    const memberCards = document.querySelectorAll('#teamGrid .team-card');
    const advisorCard = document.querySelector('.advisor-card');
    const emptyMessage = document.getElementById('teamEmpty');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedFilter = button.dataset.filter;
            let visibleMembers = 0;

            filterButtons.forEach(filterButton => {
                const isSelected = filterButton === button;
                filterButton.classList.toggle('is-active', isSelected);
                filterButton.setAttribute('aria-pressed', String(isSelected));
            });

            memberCards.forEach(card => {
                const isVisible = selectedFilter === 'all' || card.dataset.category === selectedFilter;
                card.hidden = !isVisible;
                if (isVisible) visibleMembers += 1;
            });

            advisorCard.hidden = selectedFilter !== 'all' && selectedFilter !== 'danisman';
            emptyMessage.hidden = selectedFilter === 'danisman' || visibleMembers > 0;
        });
    });
});
