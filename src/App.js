import './App.css';
import { useState, useEffect, useRef } from 'react';


// DATA & HELPERS

const KEYS = {
  books: 'lms_books',
  users: 'lms_users',
  transactions: 'lms_transactions',
  currentUser: 'lms_currentUser',
};

const ROLES = ['Member', 'Librarian', 'Admin'];
const NAV = [
  ['dashboard', 'Dashboard'],
  ['books', 'Books'],
  ['transactions', 'Transactions'],
  ['users', 'Users'],
];
const TITLES = {
  dashboard: 'Dashboard',
  books: 'Book Management',
  transactions: 'Transactions',
  users: 'User Management',
};

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 11);

const today = () => new Date().toISOString().split('T')[0];

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function fmtDate(ds) {
  if (!ds) return '-';
  const d = new Date(ds);
  if (isNaN(d.getTime())) return ds;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatus(qty) {
  if (qty === 0) return 'Out of Stock';
  if (qty === 1) return 'Low Stock';
  return 'Available';
}

function getStatusClass(status) {
  if (status === 'Out of Stock') return 'status-out';
  if (status === 'Low Stock') return 'status-low';
  return 'status-available';
}

// Shows a message for 3 seconds (used for the inline success messages)
function useFlash() {
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const flash = (m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3000);
  };
  return [msg, flash];
}

// SMALL SHARED COMPONENTS
function Field({ label, required = true, ...props }) {
  return (
    <div className="form-group">
      <label>{label}{required ? ' *' : ''}</label>
      <input required={required} {...props} />
    </div>
  );
}

function Modal({ title, small, onClose, children }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal-content' + (small ? ' modal-small' : '')}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BookRow({ book, highlight, onEdit, onDelete }) {
  const status = getStatus(book.quantity);
  return (
    <tr className={highlight && status !== 'Available' ? 'row-highlight' : undefined}>
      <td>{book.title}</td>
      <td>{book.author}</td>
      <td>{book.genre}</td>
      <td>{book.isbn}</td>
      <td>{book.quantity}</td>
      <td><span className={'status-badge ' + getStatusClass(status)}>{status}</span></td>
      <td>
        <button type="button" className="btn btn-small btn-primary" onClick={() => onEdit(book)}>Edit</button>
        <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(book)}>Delete</button>
      </td>
    </tr>
  );
}


// LOGIN

function Login({ users, onLogin }) {
  const [mid, setMid] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!mid.trim() || !pw) {
      return setError('Please enter both Membership ID and Password.');
    }
    const user = users.find((u) => u.membershipId === mid.trim() && u.password === pw);
    if (!user) return setError('Invalid Membership ID or Password.');
    setError('');
    onLogin(user);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <h1>Community Library</h1>
          <p>Library Management System</p>
        </div>

        <form onSubmit={submit}>
          <Field
            label="Membership ID"
            required={false}
            type="text"
            placeholder="Enter Membership ID"
            value={mid}
            onChange={(e) => setMid(e.target.value)}
          />
          <Field
            label="Password"
            required={false}
            type="password"
            placeholder="Enter Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block">Login</button>
        </form>

        <div className="login-hint">
          <p><strong>Default Login:</strong></p>
          <p>Membership ID: <code>admin</code></p>
          <p>Password: <code>admin123</code></p>
        </div>
      </div>
    </div>
  );
}

// DASHBOARD
function Dashboard({ books, users, onEdit, onDelete }) {
  const available = books.reduce((s, b) => s + b.quantity, 0);
  const borrowed = books.reduce((s, b) => s + (b.borrowed || 0), 0);
  const low = books.filter((b) => b.quantity === 1).length;

  const stats = [
    ['Total Books', available + borrowed],
    ['Available Copies', available],
    ['Borrowed Books', borrowed],
    ['Low Stock Books', low],
    ['Total Users', users.length],
  ];

  return (
    <section className="section active">
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-info">
              <h3>{value}</h3>
              <p>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h2>Book Availability</h2></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {['Title', 'Author', 'Genre', 'ISBN', 'Quantity', 'Status', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan="7" className="text-center">No books available.</td></tr>
              ) : (
                books.map((b) => (
                  <BookRow key={b.id} book={b} highlight onEdit={onEdit} onDelete={onDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// BOOKS
const EMPTY_BOOK = { title: '', author: '', genre: '', isbn: '', quantity: '' };

function BooksSection({ books, setBooks, showToast, onEdit, onDelete }) {
  const [form, setForm] = useState(EMPTY_BOOK);
  const [error, setError] = useState('');
  const [success, flash] = useFlash();
  const [search, setSearch] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const author = form.author.trim();
    const genre = form.genre.trim();
    const isbn = form.isbn.trim();
    const qty = parseInt(form.quantity, 10);

    if (!title || !author || !genre || !isbn) return setError('All fields are required.');
    if (isNaN(qty) || qty < 0) return setError('Quantity must be a valid positive number.');
    if (books.some((b) => b.isbn === isbn)) return setError('A book with this ISBN already exists.');

    setBooks([...books, { id: generateId(), title, author, genre, isbn, quantity: qty, borrowed: 0 }]);
    setForm(EMPTY_BOOK);
    setError('');
    flash('Book added successfully!');
    showToast('Book added successfully!');
  };

  const t = search.toLowerCase();
  const list = t
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(t) ||
          b.author.toLowerCase().includes(t) ||
          b.isbn.toLowerCase().includes(t)
      )
    : books;

  return (
    <section className="section active">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h2>Add New Book</h2></div>
          <form onSubmit={submit}>
            <Field label="Title" type="text" value={form.title} onChange={set('title')} />
            <Field label="Author" type="text" value={form.author} onChange={set('author')} />
            <Field label="Genre" type="text" value={form.genre} onChange={set('genre')} />
            <Field label="ISBN" type="text" value={form.isbn} onChange={set('isbn')} />
            <Field label="Initial Quantity" type="number" min="0" value={form.quantity} onChange={set('quantity')} />
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="btn btn-primary">Add Book</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2>Book Collection</h2></div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {['Title', 'Author', 'Genre', 'ISBN', 'Qty', 'Status', 'Actions'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      {search ? 'No books match your search.' : 'No books found. Add a book to get started.'}
                    </td>
                  </tr>
                ) : (
                  list.map((b) => <BookRow key={b.id} book={b} onEdit={onEdit} onDelete={onDelete} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditBookModal({ book, books, onSave, onClose }) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author,
    genre: book.genre,
    isbn: book.isbn,
    quantity: String(book.quantity),
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const author = form.author.trim();
    const genre = form.genre.trim();
    const isbn = form.isbn.trim();
    const qty = parseInt(form.quantity, 10);

    if (!title || !author || !genre || !isbn) return setError('All fields are required.');
    if (isNaN(qty) || qty < 0) return setError('Quantity must be a valid positive number.');
    if (books.some((b) => b.isbn === isbn && b.id !== book.id)) {
      return setError('Another book with this ISBN already exists.');
    }
    onSave({ ...book, title, author, genre, isbn, quantity: qty });
  };

  return (
    <Modal title="Edit Book" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Title" type="text" value={form.title} onChange={set('title')} />
        <Field label="Author" type="text" value={form.author} onChange={set('author')} />
        <Field label="Genre" type="text" value={form.genre} onChange={set('genre')} />
        <Field label="ISBN" type="text" value={form.isbn} onChange={set('isbn')} />
        <Field label="Quantity" type="number" min="0" value={form.quantity} onChange={set('quantity')} />
        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Update Book</button>
        </div>
      </form>
    </Modal>
  );
}

// TRANSACTIONS
function TransactionsSection({ books, setBooks, transactions, setTransactions, showToast }) {
  // Add stock
  const [stockBook, setStockBook] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockError, setStockError] = useState('');
  const [stockSuccess, flashStock] = useFlash();

  // Borrow
  const [borrowBook, setBorrowBook] = useState('');
  const [borrowError, setBorrowError] = useState('');
  const [borrowSuccess, flashBorrow] = useFlash();

  const submitStock = (e) => {
    e.preventDefault();
    const amount = parseInt(stockQty, 10);
    if (!stockBook) return setStockError('Please select a book.');
    if (isNaN(amount) || amount < 1) return setStockError('Quantity must be at least 1.');
    const book = books.find((b) => b.id === stockBook);
    if (!book) return setStockError('Book not found.');

    const prev = book.quantity;
    const next = prev + amount;
    setBooks(books.map((b) => (b.id === book.id ? { ...b, quantity: next } : b)));
    setTransactions([
      ...transactions,
      {
        id: generateId(), bookId: book.id, bookTitle: book.title,
        type: 'Stock Added', quantity: amount, previousStock: prev, newStock: next,
        date: today(),
      },
    ]);
    setStockBook('');
    setStockQty('');
    setStockError('');
    flashStock('Added ' + amount + ' copies of "' + book.title + '".');
    showToast('Stock added: ' + book.title);
  };

  const submitBorrow = (e) => {
    e.preventDefault();
    if (!borrowBook) return setBorrowError('Please select a book.');
    const book = books.find((b) => b.id === borrowBook);
    if (!book) return setBorrowError('Book not found.');
    if (book.quantity <= 0) return setBorrowError('"' + book.title + '" is currently out of stock.');

    const prev = book.quantity;
    setBooks(
      books.map((b) =>
        b.id === book.id ? { ...b, quantity: prev - 1, borrowed: (b.borrowed || 0) + 1 } : b
      )
    );
    setTransactions([
      ...transactions,
      {
        id: generateId(), bookId: book.id, bookTitle: book.title,
        type: 'Book Borrowed', quantity: 1, previousStock: prev, newStock: prev - 1,
        date: today(),
      },
    ]);
    setBorrowBook('');
    setBorrowError('');
    flashBorrow('"' + book.title + '" borrowed successfully.');
    showToast('Book borrowed: ' + book.title);
  };

  const selectedBorrow = books.find((b) => b.id === borrowBook);

  const options = books.map((b) => (
    <option key={b.id} value={b.id}>{b.title} ({b.quantity} in stock)</option>
  ));

  return (
    <section className="section active">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h2>Add Stock</h2></div>
          <form onSubmit={submitStock}>
            <div className="form-group">
              <label>Select Book *</label>
              <select required value={stockBook} onChange={(e) => setStockBook(e.target.value)}>
                <option value="">-- Select Book --</option>
                {options}
              </select>
            </div>
            <Field
              label="Quantity to Add"
              type="number"
              min="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
            {stockError && <div className="error-message">{stockError}</div>}
            {stockSuccess && <div className="success-message">{stockSuccess}</div>}
            <button type="submit" className="btn btn-success">Add Stock</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2>Borrow Book</h2></div>
          <form onSubmit={submitBorrow}>
            <div className="form-group">
              <label>Select Book *</label>
              <select required value={borrowBook} onChange={(e) => setBorrowBook(e.target.value)}>
                <option value="">-- Select Book --</option>
                {options}
              </select>
            </div>
            <div className="form-group">
              <label>Current Stock</label>
              <input
                type="text"
                readOnly
                placeholder="Select a book to see stock"
                value={selectedBorrow ? selectedBorrow.quantity + ' copies available' : ''}
              />
            </div>
            {borrowError && <div className="error-message">{borrowError}</div>}
            {borrowSuccess && <div className="success-message">{borrowSuccess}</div>}
            <button type="submit" className="btn btn-warning">Borrow Book</button>
          </form>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><h2>Transaction History</h2></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {['Date', 'Book', 'Type', 'Quantity', 'Previous Stock', 'New Stock'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="6" className="text-center">No transactions yet.</td></tr>
              ) : (
                [...transactions].reverse().map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.bookTitle || 'Unknown'}</td>
                    <td>
                      <span className={'type-badge ' + (t.type === 'Stock Added' ? 'type-stock' : 'type-borrow')}>
                        {t.type}
                      </span>
                    </td>
                    <td>{t.quantity}</td>
                    <td>{t.previousStock}</td>
                    <td>{t.newStock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// USERS
const EMPTY_USER = { name: '', membershipId: '', role: 'Member', password: '' };

function UsersSection({ users, setUsers, showToast, onEdit, onDelete }) {
  const [form, setForm] = useState(EMPTY_USER);
  const [error, setError] = useState('');
  const [success, flash] = useFlash();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const mid = form.membershipId.trim();
    if (!name || !mid || !form.role || !form.password) return setError('All fields are required.');
    if (users.some((u) => u.membershipId === mid)) {
      return setError('A user with this Membership ID already exists.');
    }
    setUsers([...users, { id: generateId(), name, membershipId: mid, role: form.role, password: form.password }]);
    setForm(EMPTY_USER);
    setError('');
    flash('User added successfully!');
    showToast('User added successfully!');
  };

  return (
    <section className="section active">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h2>Add New User</h2></div>
          <form onSubmit={submit}>
            <Field label="Full Name" type="text" value={form.name} onChange={set('name')} />
            <Field label="Membership ID" type="text" value={form.membershipId} onChange={set('membershipId')} />
            <div className="form-group">
              <label>Role *</label>
              <select required value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Field label="Password" type="password" value={form.password} onChange={set('password')} />
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="btn btn-primary">Add User</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2>User Directory</h2></div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {['Name', 'Membership ID', 'Role', 'Actions'].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">No users found.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.membershipId}</td>
                      <td><span className={'role-badge role-' + u.role.toLowerCase()}>{u.role}</span></td>
                      <td>
                        <button type="button" className="btn btn-small btn-primary" onClick={() => onEdit(u)}>Edit</button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(u)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditUserModal({ user, users, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user.name,
    membershipId: user.membershipId,
    role: user.role,
    password: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const mid = form.membershipId.trim();
    if (!name || !mid || !form.role) {
      return setError('Name, Membership ID, and Role are required.');
    }
    if (users.some((u) => u.membershipId === mid && u.id !== user.id)) {
      return setError('Another user with this Membership ID already exists.');
    }
    const updated = { ...user, name, membershipId: mid, role: form.role };
    if (form.password) updated.password = form.password;
    onSave(updated);
  };

  return (
    <Modal title="Edit User" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Full Name" type="text" value={form.name} onChange={set('name')} />
        <Field label="Membership ID" type="text" value={form.membershipId} onChange={set('membershipId')} />
        <div className="form-group">
          <label>Role *</label>
          <select required value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Field
          label="Password (leave blank to keep current)"
          required={false}
          type="password"
          value={form.password}
          onChange={set('password')}
        />
        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Update User</button>
        </div>
      </form>
    </Modal>
  );
}

// APP (state lives here, like the globals in the original)
export default function App() {
  const [books, setBooks] = useState(() => load(KEYS.books, []));
  
useEffect(() => {
  fetch("http://localhost:5000/books")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load books");
      }
      return response.json();
    })
    .then((data) => {
      setBooks(
        data.map((book) => ({
          ...book,
          borrowed: book.borrowed ?? 0,
        }))
      );
    })
    .catch((error) => {
      console.error("Error loading books:", error);
    });
}, []);

  const [users, setUsers] = useState(() => {
    const saved = load(KEYS.users, []);
    if (saved.length > 0) return saved;
    return [{ id: generateId(), name: 'Admin User', membershipId: 'admin', password: 'admin123', role: 'Admin' }];
  });
  const [transactions, setTransactions] = useState(() => load(KEYS.transactions, []));
  const [currentUser, setCurrentUser] = useState(() => load(KEYS.currentUser, null));

  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [editingBook, setEditingBook] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Save to localStorage whenever data changes
  useEffect(() => { localStorage.setItem(KEYS.books, JSON.stringify(books)); }, [books]);
  useEffect(() => { localStorage.setItem(KEYS.users, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(KEYS.transactions, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => {
    if (currentUser) localStorage.setItem(KEYS.currentUser, JSON.stringify(currentUser));
    else localStorage.removeItem(KEYS.currentUser);
  }, [currentUser]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const go = (name) => {
    setSection(name);
    setSidebarOpen(false);
  };

  const handleLogin = (user) => {
    setCurrentUser({ id: user.id, name: user.name, membershipId: user.membershipId, role: user.role });
    setSection('dashboard');
    showToast('Welcome back, ' + user.name + '!');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSidebarOpen(false);
    showToast('Logged out successfully.');
  };

  const askDeleteBook = (book) => {
    setConfirm({
      message: 'Are you sure you want to delete "' + book.title + '"? This action cannot be undone.',
      onConfirm: () => {
        setBooks((bs) => bs.filter((b) => b.id !== book.id));
        showToast('Book deleted successfully!');
      },
    });
  };

  const askDeleteUser = (user) => {
    if (currentUser && currentUser.id === user.id) {
      return showToast('You cannot delete your own account!', 'error');
    }
    setConfirm({
      message: 'Are you sure you want to delete user "' + user.name + '"?',
      onConfirm: () => {
        setUsers((us) => us.filter((u) => u.id !== user.id));
        showToast('User deleted successfully!');
      },
    });
  };

  const toastEl = (
    <div className={toast ? 'toast show ' + toast.type : 'toast hidden'}>{toast ? toast.msg : ''}</div>
  );

  if (!currentUser) {
    return (
      <>
        <Login users={users} onLogin={handleLogin} />
        {toastEl}
      </>
    );
  }

  return (
    <>
      <div className="app">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle Menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          Menu
        </button>

        <aside className={'sidebar' + (sidebarOpen ? ' open' : '')}>
          <div className="sidebar-header"><h2>Community Library</h2></div>
          <nav className="sidebar-nav">
            {NAV.map(([key, label]) => (
              <a
                key={key}
                href="#"
                className={'nav-link' + (section === key ? ' active' : '')}
                onClick={(e) => { e.preventDefault(); go(key); }}
              >
                <span className="nav-text">{label}</span>
              </a>
            ))}
            <a
              href="#"
              className="nav-link logout"
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
            >
              <span className="nav-text">Logout</span>
            </a>
          </nav>
        </aside>

        <div
          className={'sidebar-overlay' + (sidebarOpen ? ' show' : '')}
          onClick={() => setSidebarOpen(false)}
        />

        <main className="main-content">
          <header className="header">
            <h1>{TITLES[section]}</h1>
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role">{currentUser.role}</span>
              </div>
            </div>
          </header>

          <div>
            {section === 'dashboard' && (
              <Dashboard
                books={books}
                users={users}
                onEdit={setEditingBook}
                onDelete={askDeleteBook}
              />
            )}
            {section === 'books' && (
              <BooksSection
                books={books}
                setBooks={setBooks}
                showToast={showToast}
                onEdit={setEditingBook}
                onDelete={askDeleteBook}
              />
            )}
            {section === 'transactions' && (
              <TransactionsSection
                books={books}
                setBooks={setBooks}
                transactions={transactions}
                setTransactions={setTransactions}
                showToast={showToast}
              />
            )}
            {section === 'users' && (
              <UsersSection
                users={users}
                setUsers={setUsers}
                showToast={showToast}
                onEdit={setEditingUser}
                onDelete={askDeleteUser}
              />
            )}
          </div>
        </main>
      </div>

      {editingBook && (
        <EditBookModal
          book={editingBook}
          books={books}
          onClose={() => setEditingBook(null)}
          onSave={(updated) => {
            setBooks(books.map((b) => (b.id === updated.id ? updated : b)));
            setEditingBook(null);
            showToast('Book updated successfully!');
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          users={users}
          onClose={() => setEditingUser(null)}
          onSave={(updated) => {
            setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
            setEditingUser(null);
            showToast('User updated successfully!');
          }}
        />
      )}

      {confirm && (
        <Modal title="Confirm Action" small onClose={() => setConfirm(null)}>
          <p>{confirm.message}</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => { confirm.onConfirm(); setConfirm(null); }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {toastEl}
    </>
  );
}
