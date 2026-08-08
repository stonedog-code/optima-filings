# Running Optima Filings yourself

Build the image from this repository, then run it:

```bash
docker build -t optima-filings -f docker/Dockerfile .

docker run -d \
  --name optima \
  -p 3000:3000 \
  -v optima-data:/data \
  optima-filings
```

Then open <http://localhost:3000>.

There is no prebuilt image to pull. Building from source is the supported way
to run this, and it is the same Dockerfile the project uses itself — so what
you run is what is in the tree you checked out.

## The volume is not optional

`-v optima-data:/data` is where the SQLite database lives. Without it the
database is written **inside** the container and is destroyed the next time you
recreate it. The app logs its database path on startup — check that line if you
are unsure where your data went.

## Unverified rules

By default the calendar shows **only rules a person has checked against the
statute they cite**. The rule set is young, so this may well be empty.

To see unverified ones as well:

```bash
-e OPTIMA_INCLUDE_DRAFT=true
```

Every such row is marked *unverified* in the UI, and a banner says so. Treat
them as a prompt to go and check the statute, not as fact.

## Backing up

**Stop the container first.** On shutdown the app folds its write-ahead log back
into `optima.sqlite`, so a stopped container leaves a complete, copyable
database file.

```bash
docker stop optima
docker run --rm -v optima-data:/data -v "$PWD:/backup" alpine \
  tar czf /backup/optima-backup.tar.gz -C /data .
docker start optima
```

`/data` holds the database and the `documents/` directory with your uploaded
files. **Both matter** — the database records what a document is and where its
reference numbers are; the directory holds the file itself.

To restore, stop the container and untar into an empty volume.

### If you must copy while it is running

Take the whole directory, not just `optima.sqlite`. While the app is running,
recent writes live in `optima.sqlite-wal` and the main file alone is
**incomplete** — it will open without complaint and silently be missing your
latest changes, which is the worst kind of backup. Stopping first avoids the
question entirely.

## Upgrading

Pull the new image and recreate the container. Migrations run automatically on
startup — there is no separate migrate command, on purpose, because "rebuild
and restart" is the whole upgrade workflow for this tier.

```bash
git pull
docker build -t optima-filings -f docker/Dockerfile .
docker rm -f optima && docker run -d ... # same flags as above
```

Your data is on the volume, not in the container.

### Upgrading from Maximus Compliance

The product used to be called Maximus Compliance, and the image, the variables
and the database filename all changed with the name. **Keep pointing at the
volume you already have** — everything else is handled for you:

```bash
docker run -d \
  --name optima \
  -p 3000:3000 \
  -v maximus-data:/data \        # your existing volume, not a new one
  optima-filings
```

On first start the app renames `maximus.sqlite` (and its write-ahead log) to
`optima.sqlite` on the volume, and logs the move. `MAXIMUS_*` variables are still
read, with a warning naming their `OPTIMA_*` replacement.

**The one thing to get right is the volume.** Copying the `-v optima-data:/data`
line from the top of this page instead of naming your own volume gives you an
empty database and a working app with nothing in it — your data is untouched on
the old volume, but nothing on screen would tell you that.

If you would rather move to a volume named for the new product, do it while the
container is stopped:

```bash
docker volume create optima-data
docker run --rm -v maximus-data:/from -v optima-data:/to alpine \
  sh -c 'cp -a /from/. /to/'
```

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `OPTIMA_DB_PATH` | `/data/optima.sqlite` | Where the database file lives |
| `OPTIMA_INCLUDE_DRAFT` | unset (off) | Show rules not yet verified against a statute |
| `OPTIMA_DOCUMENTS_DIR` | `documents/` beside the database | Where uploaded files are stored |
| `PORT` | `3000` | Listen port |

The `MAXIMUS_*` spellings of these still work and warn on startup. They will be
removed in a future release.

## This is not legal or tax advice

The software tracks deadlines; it does not replace an attorney or an
accountant. Every obligation cites its source so you can check it. You remain
responsible for your own filings.
