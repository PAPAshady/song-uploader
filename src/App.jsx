import { useState } from "react";
import supabase from "./services/SupabaseClient";
import axios from "axios";
import "./App.css";

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genres, setGenres] = useState([]);
  const [selectedCover, setSelectedCover] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songUploadProgress, setSongUploadProgress] = useState("0%");
  const [coverUploadProgress, setCoverUploadProgress] = useState("0%");
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

    if (alreadyExists || !inputs.genre.trim()) return;

    const newGenre = {
      id: genres.length + 1,
      title: inputs.genre.trim(),
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

    if (!selectedCover) {
      alert("Please select a valid song cover");
      return;
    }

    if (!selectedSong) {
      alert("Please select a valid song file");
      return;
    }

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

      const coverPath = `${song.title}-${song.artist}-${song.id}.${
        selectedCover.type.split("/")[1]
      }`;

      const songPath = `${song.title}-${song.artist}-${song.id}.${
        selectedSong.type.split("/")[1]
      }`;

      console.log(songPath);

      // uplaod song cover to storage if it exists
      try {
        const {
          data: { signedUrl },
          error: signedUrlError,
        } = await supabase.storage
          .from("song-covers")
          .createSignedUploadUrl(coverPath);

        if (signedUrlError) {
          console.log(
            "Error while generating signed url for cover : ",
            signedUrlError
          );
          return;
        }

        await axios.put(signedUrl, selectedCover, {
          headers: {
            "Content-Type": selectedCover.type,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setCoverUploadProgress(`${percentCompleted}%`);
          },
        });
      } catch (err) {
        console.log("Error uploading song cover : ", err);
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

        await axios.put(signedUrl, selectedSong, {
          headers: {
            "Content-Type": selectedSong.type,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setSongUploadProgress(`${percentCompleted}%`);
          },
        });
      } catch (err) {
        console.log("Error uploading song file : ", err);
      }

      const {
        data: { publicUrl: coverUrl },
      } = supabase.storage.from("song-covers").getPublicUrl(coverPath);
      const {
        data: { publicUrl: songUrl },
      } = supabase.storage.from("songs").getPublicUrl(songPath);

      const updateSongUrlsResult = await supabase
        .from("songs")
        .update({ cover: coverUrl, song_url: songUrl })
        .eq("id", song.id);

      if (updateSongUrlsResult.error) throw updateSongUrlsResult.error;

      alert("Song added successfully!!!");
      clearInputs();
    } catch (err) {
      console.log("Error while adding new song to database : ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  function clearInputs() {
    setInputs({ title: "", artist: "", album: "", genre: "" });
    setGenres([]);
    setSelectedCover(null);
    setSelectedSong(null);
    setCoverUploadProgress("0%");
    setSongUploadProgress("0%");
  }

  return (
    <>
      <div className="min-h-screen p-8 bg-neutral-700">
        <div className="flex flex-col gap-6 justify-center items-center container mx-auto max-w-[700px] pt-12">
          <button className="bg-white p-4 text-lg" onClick={signInHandler}>
            sign in
          </button>

          <form
            action="#"
            className="flex flex-col gap-6 w-full"
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
              <button
                className="bg-white p-2 text-lg"
                onClick={addGenreHandler}
              >
                Add
              </button>
            </div>
            <div className="flex items-center flex-wrap max-w-[600px] gap-4">
              {genres.map((genre) => (
                <Genre
                  key={genre.id}
                  onRemove={removeGenreHandler}
                  {...genre}
                />
              ))}
            </div>
            <div className="flex items-center flex-col sm:flex-row gap-6">
              <div className="flex gap-4 items-cente grow w-full text-center">
                <label
                  htmlFor="music"
                  className="relative cursor-pointer border-dashed border text-white border-white w-full p-8"
                >
                  <span className="text-xl">Music file</span>
                  <p className="mt-2 text-neutral-300 line-clamp-1">
                    {selectedSong?.name || "No files selected"}
                  </p>
                  <div className="h-4 w-full bg-neutral-500 mt-3 relative">
                    <span className="absolute text-white -translate-1/2 left-1/2 top-1/2 text-sm">
                      {coverUploadProgress}
                    </span>
                    <div
                      className="h-full bg-blue-400"
                      style={{ width: coverUploadProgress }}
                    ></div>
                  </div>
                  <input
                    type="file"
                    id="music"
                    accept="audio/*"
                    className="absolute opacity-0"
                    onChange={(e) => setSelectedSong(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="flex gap-4 items-center grow w-full text-center">
                <label
                  htmlFor="cover"
                  className="relative cursor-pointer border-dashed border text-white border-white w-full p-8"
                >
                  <span className="text-xl">Music cover</span>
                  <p className="mt-2 text-neutral-300 line-clamp-1">
                    {selectedCover?.name || "No files selected"}
                  </p>
                  <div className="h-4 w-full bg-neutral-500 mt-3 relative">
                    <span className="absolute text-white -translate-1/2 left-1/2 top-1/2 text-sm">
                      {songUploadProgress}
                    </span>
                    <div
                      className="h-full bg-blue-400"
                      style={{ width: songUploadProgress }}
                    ></div>
                  </div>
                  <input
                    type="file"
                    id="cover"
                    accept="image/*"
                    className="absolute opacity-0"
                    onChange={(e) => setSelectedCover(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <button
              disabled={isSubmitting}
              className="text-xl bg-white p-2 disabled:bg-neutral-500 grow"
            >
              {isSubmitting ? "Please wait..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Genre({ title, onRemove, id }) {
  return (
    <div className="flex p-3 border border-white items-center gap-2">
      <span className="text-lg text-white">{title}</span>
      <button onClick={(e) => onRemove(e, id)} className="bg-white text-sm p-2">
        X
      </button>
    </div>
  );
}

export default App;
