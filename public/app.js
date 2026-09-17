"use strict";
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
function showMessage(msg, isError = false) {
    const banner = document.getElementById('message-banner');
    banner.textContent = msg;
    banner.className = isError ? 'banner error' : 'banner success';
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
}
let booksState = { availability: '', sort: 'title', page: 1, pageSize: 20 };
/**
 * Renders the books table body given the current page of book rows.
 * Extracted from the previous loadBooks() body so it can be reused
 * across the initial load, filter/sort changes, and pagination.
 */
function renderBooksTable(books) {
    try {
        const container = document.getElementById('books-list');
        if (!container)
            return;
        if (books.length === 0) {
            container.innerHTML = '<p class="empty">No books match the selected filter.</p>';
            return;
        }
        container.innerHTML = `
      <table>
        <thead>
          <tr><th>Title</th><th>Author</th><th>ISBN</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${books.map(b => `
            <tr>
              <td>${escapeHtml(b.title)}</td>
              <td>${escapeHtml(b.author)}</td>
              <td>${escapeHtml(b.isbn)}</td>
              <td class="${b.is_available ? 'available' : 'issued'}">${b.is_available ? 'Available' : 'Issued'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    }
    catch (err) {
        console.error('Failed to render books table:', err);
    }
}
/**
 * Renders Prev/Next pagination controls and a "Page X of Y" indicator
 * below the books table. Navigating pages only mutates booksState.page
 * (filter/sort are left as-is); filter/sort changes reset to page 1
 * separately in onFilterOrSortChange().
 */
function renderBooksPagination(data) {
    try {
        const container = document.getElementById('books-pagination');
        if (!container)
            return;
        if (data.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
      <button type="button" id="books-prev-btn" ${data.page <= 1 ? 'disabled' : ''}>&lt; Prev</button>
      <span>Page ${data.page} of ${data.totalPages}</span>
      <button type="button" id="books-next-btn" ${data.page >= data.totalPages ? 'disabled' : ''}>Next &gt;</button>
    `;
        const prevBtn = document.getElementById('books-prev-btn');
        const nextBtn = document.getElementById('books-next-btn');
        prevBtn?.addEventListener('click', () => {
            if (booksState.page > 1) {
                booksState.page -= 1;
                loadBooks();
            }
        });
        nextBtn?.addEventListener('click', () => {
            if (booksState.page < data.totalPages) {
                booksState.page += 1;
                loadBooks();
            }
        });
    }
    catch (err) {
        console.error('Failed to render books pagination:', err);
    }
}
async function loadBooks() {
    try {
        const params = new URLSearchParams();
        if (booksState.availability)
            params.set('availability', booksState.availability);
        params.set('sort', booksState.sort);
        params.set('page', String(booksState.page));
        params.set('pageSize', String(booksState.pageSize));
        const res = await fetch(`/api/books?${params.toString()}`);
        if (!res.ok) {
            showMessage('Failed to load books.', true);
            return;
        }
        const data = await res.json();
        renderBooksTable(data.books);
        renderBooksPagination(data);
    }
    catch (err) {
        console.error('Failed to load books:', err);
        showMessage('Failed to load books.', true);
    }
}
/**
 * Reads the current Availability/Sort control values, resets the
 * view to page 1 (FR7/AC6: any filter or sort change resets paging),
 * and re-fetches the books list.
 */
function onFilterOrSortChange() {
    try {
        const availabilitySelect = document.getElementById('availability-filter');
        const sortSelect = document.getElementById('sort-select');
        booksState.availability = availabilitySelect.value;
        booksState.sort = sortSelect.value;
        booksState.page = 1;
        loadBooks();
    }
    catch (err) {
        console.error('Failed to apply filter/sort change:', err);
    }
}
/**
 * Restores the default (unfiltered, Title A-Z, page 1) books view
 * (FR5/AC7) and resets the filter/sort controls to match.
 */
function onResetFilters() {
    try {
        booksState = { availability: '', sort: 'title', page: 1, pageSize: 20 };
        const availabilitySelect = document.getElementById('availability-filter');
        const sortSelect = document.getElementById('sort-select');
        availabilitySelect.value = '';
        sortSelect.value = 'title';
        loadBooks();
    }
    catch (err) {
        console.error('Failed to reset filters:', err);
    }
}
function renderMembersTable(members) {
    const container = document.getElementById('members-list');
    if (members.length === 0) {
        container.innerHTML = '<p class="empty">No members found.</p>';
        return;
    }
    container.innerHTML = `
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th></tr>
      </thead>
      <tbody>
        ${members.map(m => `
          <tr>
            <td>${escapeHtml(m.name)}</td>
            <td>${escapeHtml(m.email)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
async function loadMembers() {
    const res = await fetch('/api/members');
    const members = await res.json();
    renderMembersTable(members);
}
async function searchMembers(query) {
    const trimmed = query.trim();
    if (!trimmed) {
        loadMembers();
        return;
    }
    const res = await fetch(`/api/members/search?q=${encodeURIComponent(trimmed)}`);
    const members = await res.json();
    renderMembersTable(members);
}
async function loadAvailableBooksSelect() {
    try {
        // Request the max allowed pageSize (100, matching the server-side cap)
        // so the Issue Book dropdown isn't truncated to the default page size.
        const res = await fetch('/api/books?pageSize=100');
        if (!res.ok) {
            showMessage('Failed to load books for issuing.', true);
            return;
        }
        const data = await res.json();
        const select = document.getElementById('issue-book-select');
        select.innerHTML = '<option value="">-- Select a Book --</option>';
        data.books.filter(b => b.is_available).forEach(b => {
            const opt = document.createElement('option');
            opt.value = String(b.id);
            opt.textContent = `${b.title} — ${b.author}`;
            select.appendChild(opt);
        });
    }
    catch (err) {
        console.error('Failed to load available books select:', err);
        showMessage('Failed to load books for issuing.', true);
    }
}
async function loadMembersSelect() {
    const res = await fetch('/api/members');
    const members = await res.json();
    const select = document.getElementById('issue-member-select');
    select.innerHTML = '<option value="">-- Select a Member --</option>';
    members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = String(m.id);
        opt.textContent = m.name;
        select.appendChild(opt);
    });
}
async function loadLoans() {
    const res = await fetch('/api/loans');
    const loans = await res.json();
    const container = document.getElementById('loans-list');
    if (loans.length === 0) {
        container.innerHTML = '<p class="empty">No books currently issued.</p>';
        return;
    }
    container.innerHTML = `
    <table>
      <thead>
        <tr><th>Book</th><th>Issued To</th><th>Issued Date</th><th>Due Date</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${loans.map(l => `
          <tr>
            <td>${escapeHtml(l.title)}</td>
            <td>${escapeHtml(l.name)}</td>
            <td>${escapeHtml(l.issued_date)}</td>
            <td>${l.due_date ? escapeHtml(l.due_date) : '—'}</td>
            <td><button class="return-btn" data-loan-id="${l.id}">Return</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
/**
 * Renders the Overdue Loans table, or an empty-state message when
 * there are no overdue loans (AISDLC-7 / T4, T5).
 */
function renderOverdueLoans(loans) {
    try {
        const container = document.getElementById('overdue-loans-list');
        if (!container)
            return;
        if (loans.length === 0) {
            container.innerHTML = '<p class="empty">No overdue loans right now.</p>';
            return;
        }
        container.innerHTML = `
      <table>
        <thead>
          <tr><th>Member</th><th>Email</th><th>Book</th><th>ISBN</th><th>Issued</th><th>Due</th><th>Days Overdue</th></tr>
        </thead>
        <tbody>
          ${loans.map(l => `
            <tr>
              <td>${escapeHtml(l.name)}</td>
              <td>${escapeHtml(l.email)}</td>
              <td>${escapeHtml(l.title)}</td>
              <td>${escapeHtml(l.isbn)}</td>
              <td>${escapeHtml(l.issued_date)}</td>
              <td>${escapeHtml(l.due_date)}</td>
              <td>${l.days_overdue}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    }
    catch (err) {
        console.error('Failed to render overdue loans:', err);
    }
}
/**
 * Fetches the overdue loans list from the server (AISDLC-7 / T3) and
 * renders it, showing an error banner if the request fails.
 */
async function loadOverdueLoans() {
    try {
        const res = await fetch('/api/loans/overdue');
        if (!res.ok) {
            showMessage('Failed to load overdue loans.', true);
            return;
        }
        const overdueLoans = await res.json();
        renderOverdueLoans(overdueLoans);
    }
    catch (err) {
        console.error('Failed to load overdue loans:', err);
        showMessage('Failed to load overdue loans.', true);
    }
}
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
            if (target === 'books')
                loadBooks();
            if (target === 'members')
                loadMembers();
            if (target === 'issue') {
                loadAvailableBooksSelect();
                loadMembersSelect();
            }
            if (target === 'return')
                loadLoans();
            if (target === 'overdue')
                loadOverdueLoans();
        });
    });
}
function initForms() {
    document.getElementById('add-book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const isbn = document.getElementById('book-isbn').value.trim();
        const bookError = document.getElementById('book-error');
        bookError.textContent = '';
        const res = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, isbn })
        });
        if (res.ok) {
            form.reset();
            showMessage('Book added successfully.');
            loadBooks();
        }
        else {
            const err = await res.json();
            bookError.textContent = err.error || 'Failed to add book.';
        }
    });
    document.getElementById('add-member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = document.getElementById('member-name').value.trim();
        const email = document.getElementById('member-email').value.trim();
        const memberError = document.getElementById('member-error');
        memberError.textContent = '';
        const res = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        if (res.ok) {
            form.reset();
            showMessage('Member added successfully.');
            loadMembers();
        }
        else {
            const err = await res.json();
            memberError.textContent = err.error || 'Failed to add member.';
        }
    });
    document.getElementById('issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const book_id = parseInt(document.getElementById('issue-book-select').value);
        const member_id = parseInt(document.getElementById('issue-member-select').value);
        if (!book_id || !member_id) {
            showMessage('Please select both a book and a member.', true);
            return;
        }
        const res = await fetch('/api/loans/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id, member_id })
        });
        if (res.ok) {
            const data = await res.json();
            showMessage(`Book issued successfully. Due date: ${data.due_date}`);
            loadAvailableBooksSelect();
        }
        else {
            const err = await res.json();
            showMessage(err.error || 'Failed to issue book.', true);
        }
    });
    document.getElementById('loans-list').addEventListener('click', async (e) => {
        const target = e.target;
        if (!target.classList.contains('return-btn'))
            return;
        const loanId = parseInt(target.dataset.loanId);
        const res = await fetch('/api/loans/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loan_id: loanId })
        });
        if (res.ok) {
            showMessage('Book returned successfully.');
            loadLoans();
        }
        else {
            const err = await res.json();
            showMessage(err.error || 'Failed to return book.', true);
        }
    });
}
function initBooksControls() {
    try {
        const availabilitySelect = document.getElementById('availability-filter');
        const sortSelect = document.getElementById('sort-select');
        const resetBtn = document.getElementById('reset-filters-btn');
        availabilitySelect?.addEventListener('change', onFilterOrSortChange);
        sortSelect?.addEventListener('change', onFilterOrSortChange);
        resetBtn?.addEventListener('click', onResetFilters);
    }
    catch (err) {
        console.error('Failed to initialize books controls:', err);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
    initBooksControls();
    loadBooks();
    const searchInput = document.getElementById('member-search');
    searchInput.addEventListener('input', debounce((e) => {
        const target = e.target;
        searchMembers(target.value);
    }, 300));
});
