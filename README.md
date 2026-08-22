# Utilities

> A place to hold many different utilities, like converters and calculations <br/>
> [Live - Utilities Website](https://utilities.ryan-brock.com/)

---

## 📚 Table of Contents

- [What's My Purpose?](#-whats-my-purpose)
- [How to Use](#-how-to-use)
- [Technologies](#-technologies)
- [Getting Started (Local Setup)](#-getting-started-local-setup)
  - [Run Locally](#run-locally)
  - [Test](#test)
  - [GitHub Hooks](#github-hooks)
  - [Build](#build)
  - [Deploy](#deploy)
- [How to Contribute](#-how-to-contribute)

---

## 🧠 What's My Purpose?

This is a client side single-page angular frontend created to hold many different utilities, like converters and calculators, all in one place.

---

## 🚦 How to Use

- `Select Utility` - Select any utility from the home page to open it
- Each utility is self-contained on its own page

---

## 🛠 Technologies

- Framework: `Angular 22`
- Testing: `Vitest`
- Deployment: `GitHub Pages`

---

## 🚀 Getting Started (Local Setup)

* Install [node](https://nodejs.org/en) - v22 is needed
* Clone [repo](https://github.com/rbrock44/utilities)

---

### Run Locally

```
npm install
npm start
```

---

### Test

- Unit
  - ng test || npm run test

---

### Github Hooks

- Build
    - Trigger: On Push to Main
    - Action(s): Builds application then kicks off gh page action to deploy build output

---

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

---

### Deploy

Run `npm run prod` to build and deploy the project. Make sure to be on `master` and that it is up to date before running the command. It's really meant to be a CI/CD action

---

## 🤝 How to Contribute

Found a typo or a small, obvious fix? Open a PR directly.
Want to change behavior or add something bigger? Open an issue first so we can talk it through before you put in the work.

---
