interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  is_available: number;
}

interface BooksResponse {
  books: Book[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BooksState {
  availability: string;
  sort: string;
  page: number;
  pageSize: number;
}

interface Member {
  id: number;
  name: string;
  email: string;
}

interface MembersResponse {
  members: Member[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Loan {
  id: number;
  book_id: number;
  member_id: number;
  title: string;
  author: string;
  name: string;
  issued_date: string;
  due_date: string | null;
}

interface OverdueLoan {
  id: number;
  issued_date: string;
  due_date: string;
  book_id: number;
  title: string;
  isbn: string;
  member_id: number;
  name: string;
  email: string;
  days_overdue: number;
}

function debounce(fn: Function, delay: number): (...args: unknown[]) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function showMessage(msg: string, isError = false): void {
  const banner = document.getElementById('message-banner') as HTMLDivElement;
  banner.textContent = msg;
  banner.className = isError ? 'banner error' : 'banner success';
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, 3000);
}

let booksState: BooksState = { availability: '', sort: 'title', page: 1, pageSize: 20 };

/**
 * Renders the books table body given the current page of book rows.
 * Extracted from the previous loadBooks() body so it can be reused
 * across the initial load, filter/sort changes, and pagination.
 */
function renderBooksTable(books: Book[]): void {
  try {
    const container = document.getElementById('books-list') as HTMLDivElement;
    if (!container) return;
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
  } catch (err) {
    console.error('Failed to render books table:', err);
  }
}

/**
 * Renders Prev/Next pagination controls and a "Page X of Y" indicator
 * below the books table. Navigating pages only mutates booksState.page
 * (filter/sort are left as-is); filter/sort changes reset to page 1
 * separately in onFilterOrSortChange().
 */
function renderBooksPagination(data: BooksResponse): void {
  try {
    const container = document.getElementById('books-pagination') as HTMLDivElement;
    if (!container) return;

    if (data.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <button type="button" id="books-prev-btn" ${data.page <= 1 ? 'disabled' : ''}>&lt; Prev</button>
      <span>Page ${data.page} of ${data.totalPages}</span>
      <button type="button" id="books-next-btn" ${data.page >= data.totalPages ? 'disabled' : ''}>Next &gt;</button>
    `;

    const prevBtn = document.getElementById('books-prev-btn') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('books-next-btn') as HTMLButtonElement | null;

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
  } catch (err) {
    console.error('Failed to render books pagination:', err);
  }
}

async function loadBooks(): Promise<void> {
  try {
    const params = new URLSearchParams();
    if (booksState.availability) params.set('availability', booksState.availability);
    params.set('sort', booksState.sort);
    params.set('page', String(booksState.page));
    params.set('pageSize', String(booksState.pageSize));

    const res = await fetch(`/api/books?${params.toString()}`);
    if (!res.ok) {
      showMessage('Failed to load books.', true);
      return;
    }
    const data = await res.json() as BooksResponse;
    renderBooksTable(data.books);
    renderBooksPagination(data);
  } catch (err) {
    console.error('Failed to load books:', err);
    showMessage('Failed to load books.', true);
  }
}

/**
 * Reads the current Availability/Sort control values, resets the
 * view to page 1 (FR7/AC6: any filter or sort change resets paging),
 * and re-fetches the books list.
 */
function onFilterOrSortChange(): void {
  try {
    const availabilitySelect = document.getElementById('availability-filter') as HTMLSelectElement;
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    booksState.availability = availabilitySelect.value;
    booksState.sort = sortSelect.value;
    booksState.page = 1;
    loadBooks();
  } catch (err) {
    console.error('Failed to apply filter/sort change:', err);
  }
}

/**
 * Restores the default (unfiltered, Title A-Z, page 1) books view
 * (FR5/AC7) and resets the filter/sort controls to match.
 */
function onResetFilters(): void {
  try {
    booksState = { availability: '', sort: 'title', page: 1, pageSize: 20 };
    const availabilitySelect = document.getElementById('availability-filter') as HTMLSelectElement;
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    availabilitySelect.value = '';
    sortSelect.value = 'title';
    loadBooks();
  } catch (err) {
    console.error('Failed to reset filters:', err);
  }
}

function renderMembersTable(members: Member[]): void {
  const container = document.getElementById('members-list') as HTMLDivElement;
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

async function loadMembers(): Promise<void> {
  // AISDLC-3: GET /api/members now returns a paginated envelope
  // ({ members, page, pageSize, total, totalPages }) instead of a
  // flat array, mirroring GET /api/books. Request the max allowed
  // pageSize (100, matching the server-side cap) so this page
  // continues to show the full member list at a glance, same as
  // the previous unpaginated behavior, without adding pagination
  // controls to the UI (still out of scope for AISDLC-3). Members
  // are ordered oldest-first (id ASC, unchanged), so without this
  // the default pageSize=20 would hide any member beyond the first
  // 20 rows once the table grows past that size.
  const res = await fetch('/api/members?pageSize=100');
  const data = await res.json() as MembersResponse;
  renderMembersTable(data.members);
}

async function searchMembers(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    loadMembers();
    return;
  }
  const res = await fetch(`/api/members/search?q=${encodeURIComponent(trimmed)}`);
  const members = await res.json() as Member[];
  renderMembersTable(members);
}

async function loadAvailableBooksSelect(): Promise<void> {
  try {
    // Request the max allowed pageSize (100, matching the server-side cap)
    // so the Issue Book dropdown isn't truncated to the default page size.
    const res = await fetch('/api/books?pageSize=100');
    if (!res.ok) {
      showMessage('Failed to load books for issuing.', true);
      return;
    }
    const data = await res.json() as BooksResponse;
    const select = document.getElementById('issue-book-select') as HTMLSelectElement;
    select.innerHTML = '<option value="">-- Select a Book --</option>';
    data.books.filter(b => b.is_available).forEach(b => {
      const opt = document.createElement('option');
      opt.value = String(b.id);
      opt.textContent = `${b.title} — ${b.author}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load available books select:', err);
    showMessage('Failed to load books for issuing.', true);
  }
}

async function loadMembersSelect(): Promise<void> {
  const res = await fetch('/api/members?pageSize=100');
  // AISDLC-3: same paginated-envelope change as loadMembers() above.
  const data = await res.json() as MembersResponse;
  const select = document.getElementById('issue-member-select') as HTMLSelectElement;
  select.innerHTML = '<option value="">-- Select a Member --</option>';
  data.members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.name;
    select.appendChild(opt);
  });
}

async function loadLoans(): Promise<void> {
  const res = await fetch('/api/loans');
  const loans = await res.json() as Loan[];
  const container = document.getElementById('loans-list') as HTMLDivElement;
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
function renderOverdueLoans(loans: OverdueLoan[]): void {
  try {
    const container = document.getElementById('overdue-loans-list') as HTMLDivElement;
    if (!container) return;
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
  } catch (err) {
    console.error('Failed to render overdue loans:', err);
  }
}

/**
 * Fetches the overdue loans list from the server (AISDLC-7 / T3) and
 * renders it, showing an error banner if the request fails.
 */
async function loadOverdueLoans(): Promise<void> {
  try {
    const res = await fetch('/api/loans/overdue');
    if (!res.ok) {
      showMessage('Failed to load overdue loans.', true);
      return;
    }
    const overdueLoans = await res.json() as OverdueLoan[];
    renderOverdueLoans(overdueLoans);
  } catch (err) {
    console.error('Failed to load overdue loans:', err);
    showMessage('Failed to load overdue loans.', true);
  }
}

function initTabs(): void {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab as string;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      (document.getElementById(target) as HTMLElement).classList.add('active');

      if (target === 'books') loadBooks();
      if (target === 'members') loadMembers();
      if (target === 'issue') { loadAvailableBooksSelect(); loadMembersSelect(); }
      if (target === 'return') loadLoans();
      if (target === 'overdue') loadOverdueLoans();
    });
  });
}

function initForms(): void {
  (document.getElementById('add-book-form') as HTMLFormElement).addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (document.getElementById('book-title') as HTMLInputElement).value.trim();
    const author = (document.getElementById('book-author') as HTMLInputElement).value.trim();
    const isbn = (document.getElementById('book-isbn') as HTMLInputElement).value.trim();
    const bookError = document.getElementById('book-error') as HTMLSpanElement;
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
    } else {
      const err = await res.json() as { error: string };
      bookError.textContent = err.error || 'Failed to add book.';
    }
  });

  (document.getElementById('add-member-form') as HTMLFormElement).addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (document.getElementById('member-name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('member-email') as HTMLInputElement).value.trim();
    const memberError = document.getElementById('member-error') as HTMLSpanElement;
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
    } else {
      const err = await res.json() as { error: string };
      memberError.textContent = err.error || 'Failed to add member.';
    }
  });

  (document.getElementById('issue-form') as HTMLFormElement).addEventListener('submit', async (e) => {
    e.preventDefault();
    const book_id = parseInt((document.getElementById('issue-book-select') as HTMLSelectElement).value);
    const member_id = parseInt((document.getElementById('issue-member-select') as HTMLSelectElement).value);

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
      const data = await res.json() as { message: string; due_date: string };
      showMessage(`Book issued successfully. Due date: ${data.due_date}`);
      loadAvailableBooksSelect();
    } else {
      const err = await res.json() as { error: string };
      showMessage(err.error || 'Failed to issue book.', true);
    }
  });

  (document.getElementById('loans-list') as HTMLDivElement).addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('return-btn')) return;
    const loanId = parseInt(target.dataset.loanId as string);

    const res = await fetch('/api/loans/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loan_id: loanId })
    });
    if (res.ok) {
      showMessage('Book returned successfully.');
      loadLoans();
    } else {
      const err = await res.json() as { error: string };
      showMessage(err.error || 'Failed to return book.', true);
    }
  });
}

function initBooksControls(): void {
  try {
    const availabilitySelect = document.getElementById('availability-filter') as HTMLSelectElement | null;
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;
    const resetBtn = document.getElementById('reset-filters-btn') as HTMLButtonElement | null;

    availabilitySelect?.addEventListener('change', onFilterOrSortChange);
    sortSelect?.addEventListener('change', onFilterOrSortChange);
    resetBtn?.addEventListener('click', onResetFilters);
  } catch (err) {
    console.error('Failed to initialize books controls:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initForms();
  initBooksControls();
  loadBooks();

  const searchInput = document.getElementById('member-search') as HTMLInputElement;
  searchInput.addEventListener('input', debounce((e: Event) => {
    const target = e.target as HTMLInputElement;
    searchMembers(target.value);
  }, 300));
});
