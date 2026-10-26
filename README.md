<p align="center">
  <img src="public/logo.png" alt="Penny Pals logo" width="120" />
</p>

<h1 align="center">Penny Pals</h1>

<p align="center">
  Split expenses with friends, track who owes whom, and settle up.
</p>

<p align="center">
  <a href="https://YOUR-APP.vercel.app"><b>Live demo</b></a>
</p>

---

## Screenshots

| Dashboard | Add expense |
| :---: | :---: |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Add expense](docs/screenshots/add-expense.png) |

| Friends | Transactions |
| :---: | :---: |
| ![Friends](docs/screenshots/friends.png) | ![Transactions](docs/screenshots/transactions.png) |

| Dark mode |
| :---: |
| ![Dark mode](docs/screenshots/dark-mode.png) |

## Features

- Sign up and log in with email and password (with email verification and password reset)
- Add friends by username and accept friend requests
- Create, edit and delete shared expenses with exact splits
- Dashboard with running balances per friend
- Record settlements between friends
- Notifications, a transaction history and profile settings
- Light and dark theme

> Settlements are *recorded only*. No real money moves through the app. All amounts are stored in paise to avoid rounding errors.

## Tech stack

- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Supabase](https://supabase.com) (Auth, Postgres, Row Level Security)
- [Vercel](https://vercel.com) for hosting

## License

Released under the [MIT License](LICENSE).
