import { useState, useRef } from "react";
import supabase from "./services/SupabaseClient";
import axios from "axios";
import "./App.css";

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const coverInputFileRef = useRef(null);
  const songInputFileRef = useRef(null);
  const [genres, setGenres] = useState([]);
  const [inputs, setInputs] = useState({
    title: "",
    album: "Single",
    artist: "",
    genre: "",
  });

  async function signInHandler() {
    const result = await supabase.auth.signInWithOAuth({ provider: "github" });
    console.log(result);
  }

  const addGenreHandler = (e) => {
    e.preventDefault();

    const alreadyExists = genres.some((genre) => genre.title === inputs.genre);

    if (alreadyExists) return;

    const newGenre = {
      id: genres.length + 1,
      title: inputs.genre,
    };

    setGenres((prevGenres) => [...prevGenres, newGenre]);
    setInputs((prev) => {
      return {
        ...prev,
        genre: "",
      };
    });
  };

  const removeGenreHandler = (e, id) => {
    e.preventDefault();
    const newGenres = genres.filter((genre) => genre.id !== id);
    setGenres(newGenres);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const coverFile = coverInputFileRef.current.files?.[0];
    const songFile = songInputFileRef.current.files[0];

    // first uplaod the song metadata to database
    try {
      setIsSubmitting(true);
      const {
        data: [song],
        error,
      } = await supabase
        .from("songs")
        .insert({
          title: inputs.title,
          album: inputs.album,
          artist: inputs.artist,
          genres: genres.map((genre) => genre.title),
        })
        .select();
      if (error) throw error;

      const coverPath = `songs/${song.title}-${song.artist}-${song.id}.${
        coverFile.type.split("/")[1]
      }`;
      const songPath = `${song.title}-${song.artist}-${song.id}.${
        songFile.type.split("/")[1]
      }`;

      // uplaod song cover to storage if it exists
      if (coverFile) {
        try {
          const {
            data: { signedUrl },
            error: signedUrlError,
          } = await supabase.storage
            .from("covers")
            .createSignedUploadUrl(coverPath);

          if (signedUrlError) {
            console.log(
              "Error while generating signed url for cover : ",
              signedUrlError
            );
            return;
          }

          await axios.put(signedUrl, coverFile, {
            headers: {
              "Content-Type": coverFile.type,
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              console.log(`Cover upload Progress: ${percentCompleted}%`);
            },
          });
        } catch (err) {
          console.log("Error uploading song cover : ", err);
        }
      }

      // uplaod song it self to storage
      try {
        const {
          data: { signedUrl },
          error: signedUrlError,
        } = await supabase.storage
          .from("songs")
          .createSignedUploadUrl(songPath);

        if (signedUrlError) {
          console.log(
            "Error while generating signed url for Song : ",
            signedUrlError
          );
          return;
        }

        await axios.put(signedUrl, songFile, {
          headers: {
            "Content-Type": songFile.type,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Song upload Progress: ${percentCompleted}%`);
          },
        });
      } catch (err) {
        console.log("Error uploading song file : ", err);
      }

      const {
        data: { publicUrl: coverUrl },
      } = supabase.storage.from("covers").getPublicUrl(coverPath);
      const {
        data: { publicUrl: songUrl },
      } = supabase.storage.from("songs").getPublicUrl(songPath);

      const updateSongUrlsResult = await supabase
        .from("songs")
        .update({ cover: coverUrl, song_url: songUrl })
        .eq("id", song.id);

      if (updateSongUrlsResult.error) throw updateSongUrlsResult.error;

      console.log("Song added successfully!!!");

      console.log(coverUrl, songUrl);
    } catch (err) {
      console.log("Error while adding new song to database : ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen py-8 bg-neutral-700 flex flex-col gap-6 justify-center items-center">
        <button className="bg-white p-4 text-lg" onClick={signInHandler}>
          sign in
        </button>

        <form
          action="#"
          className="flex flex-col gap-6"
          onSubmit={submitHandler}
        >
          <input
            type="text"
            value={inputs.title}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, title: e.target.value };
              })
            }
            placeholder="title"
          />
          <input
            type="text"
            value={inputs.album}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, album: e.target.value };
              })
            }
            placeholder="album"
          />
          <input
            type="text"
            value={inputs.artist}
            onChange={(e) =>
              setInputs((prevInputs) => {
                return { ...prevInputs, artist: e.target.value };
              })
            }
            placeholder="artist"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputs.genre}
              onChange={(e) =>
                setInputs((prevInputs) => {
                  return { ...prevInputs, genre: e.target.value };
                })
              }
              placeholder="genre"
            />
            <button className="bg-white p-2 text-lg" onClick={addGenreHandler}>
              Add
            </button>
          </div>
          <div className="flex items-center flex-wrap max-w-[600px] gap-4">
            {genres.map((genre) => (
              <Genre key={genre.id} onRemove={removeGenreHandler} {...genre} />
            ))}
          </div>
          <div className="flex gap-4 items-center">
            <label htmlFor="music" className="text-xl">
              Music file
            </label>
            <input
              ref={songInputFileRef}
              type="file"
              id="music"
              accept="audio/mp3"
            />
          </div>
          <div className="flex gap-4 items-center">
            <label htmlFor="cover" className="text-xl">
              Music cover
            </label>
            <input
              ref={coverInputFileRef}
              type="file"
              id="cover"
              accept="image/*"
            />
          </div>
          <button
            disabled={isSubmitting}
            className="text-xl bg-white p-2 disabled:bg-neutral-500"
          >
            {isSubmitting ? "Please wait..." : "Submit"}
          </button>
        </form>
      </div>
    </>
  );
}

function Genre({ title, onRemove, id }) {
  return (
    <div className="flex p-3 border border-white items-center gap-2">
      <span className="text-lg text-white">{title}</span>
      <button
        onClick={(e) => onRemove(e, id)}
        className="bg-white text-sm p-2 text-lg"
      >
        X
      </button>
    </div>
  );
}

export default App;
