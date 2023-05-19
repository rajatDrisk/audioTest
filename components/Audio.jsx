"use client";
import React, { use, useRef, useState } from "react";
import { useEffect } from "react";
import Image from "next/image";

import micMute from "../assets/micMute.svg";
import micUnmute from "../assets/micUnmute.svg";

// ! Attention, I have commented some data in liveleaderboard modal for this. Make sure to uncomment that when merged!
const Audio = ({ userProfile, roomId = "1226" }) => {
  // ! App Id
  const appId = "0f6969c86d1147258809fb489f9e18d2";
  const token = null;
  const rtcUid = Math.floor(Math.random() * 2032);
  const rtmUid = toString(Math.floor(Math.random() * 2032));
  // const rtcUid = userProfile.id;
  // const rtmUid = userProfile.id;

  // ! References
  const rtcClient = useRef();
  const AgoraRTC = useRef();
  const rtmClient = useRef();
  const AgoraRTM = useRef();
  const channel = useRef();
  const userChat = useRef();

  // ! States
  const [call, setCall] = useState(true);
  const [allUsers, setAllusers] = useState([]);
  const [localMute, setLocalMute] = useState(true);
  const [audioTracks, setAudiotracks] = useState({
    localAudioTrack: null,
    remoteAudioTrack: {},
  });

  // ! Use Effects to mount events and method calling

  useEffect(() => {
    initRtm("testing", "");
    initRtc();
  }, []);

  // useEffect(() => {
  //   if (audioTracks.localAudioTrack)
  //     return () => {
  //       leaveRoom();
  //     };
  // }, [audioTracks]);

  // * useeffect to remove the user from the server if they chose to close the window
  useEffect(() => {
    window.addEventListener("beforeunload", leaveRtmChannel);

    return () => {
      window.removeEventListener("beforeunload", leaveRtmChannel);
    };
  }, []);

  // ! Methods used (as per the calling order)

  // * Getting the agoraRTM client and rtc client in first mount
  const initRtm = async (name, image) => {
    AgoraRTM.current = await import("agora-rtm-sdk");
    rtmClient.current = AgoraRTM.current.createInstance(appId);

    await rtmClient.current.login({ uid: rtmUid, token: token });

    // * passing the info to the local user
    rtmClient.current.addOrUpdateLocalUserAttributes({
      name: name,
      image: image,
    });

    channel.current = rtmClient.current.createChannel(roomId);
    await channel.current.join();

    // ? adding the user to set (for managing the unique values)
    getChannelMembers();

    // * new remote user joined
    channel.current.on("MemberJoined", handleMemberJoined);

    // * member left
    channel.current.on("MemberLeft", handleMemberLeave);
  };

  // * Getting the agoraRTC client and rtc client in first mount
  const initRtc = async () => {
    setCall(true);
    AgoraRTC.current = await import("agora-rtc-sdk-ng");
    rtcClient.current = AgoraRTC.current.createClient({
      mode: "rtc",
      codec: "vp8",
    });

    // * new local user joined
    const localuser = await rtcClient.current.join(
      appId,
      roomId,
      token,
      rtcUid
    );

    // * getting the local user audio and publishing it to server for other users
    let localAudio = await AgoraRTC.current.createMicrophoneAudioTrack();

    // ? mute the localuser or set the value to intial localAudio state value
    localAudio.setMuted(true);

    setAudiotracks((prev) => ({
      ...prev,
      localAudioTrack: localAudio,
    }));
    await rtcClient.current?.publish(localAudio);

    // * calling the remote user audio function
    rtcClient.current.on("user-published", handleUserPublished);

    // * handling user leave
    rtcClient.current.on("user-left", handleUserLeft);

    // * init volume indicator
    initVolumeIndicator();
  };

  // * leave room method for rtm
  const leaveRtmChannel = async () => {
    await channel.current.leave();
    await rtmClient.current.logout();
  };

  // * Exit method for the local user
  const leaveRoom = () => {
    if (call) {
      audioTracks.localAudioTrack.stop();
      audioTracks.localAudioTrack.close();
      rtcClient.current.unpublish();
      rtcClient.current.leave();

      leaveRtmChannel();

      setCall(false);
      // setAllusers([]);
      // setUniqueusers(new Set());
    }
  };

  // * Getting the remote user audio and playing it.
  const handleUserPublished = async (user, mediaType) => {
    await rtcClient.current.subscribe(user, mediaType);

    if (mediaType == "audio") {
      setAudiotracks((prev) => ({
        ...prev,
        remoteAudioTrack: {
          ...prev.remoteAudioTrack,
          [user.uid]: user.audioTrack,
        },
      }));

      user.audioTrack.play();
    }
  };

  // * method to delete the user audio when they leave the server
  const handleUserLeft = async (user) => {
    // ? delete the audioTrack from audioTracks state
    setAudiotracks((prev) => {
      // Create a copy of the previous state
      const updatedAudioTracks = { ...prev };

      // Delete the object you want to remove from remoteAudioTrack
      delete updatedAudioTracks.remoteAudioTrack[user.uid];

      // Return the updated state
      return updatedAudioTracks;
    });
  };

  // * handling the updation of the UI with all users

  const getChannelMembers = async () => {
    let members = await channel.current.getMembers();

    members.map(async (member) => {
      // ? getting the keys (info) from the user
      let { name, image } = await rtmClient.current.getUserAttributesByKeys(
        member,
        ["name", "image"]
      );

      setAllusers((prev) => [
        ...prev,
        {
          id: member,
          name: name,
          image: image,
        },
      ]);
    });
  };

  // * handle the member leave functionality and handling the UI and deleting the user that left

  const handleMemberLeave = async (memberId) => {
    setAllusers((prev) => {
      const updatedUsers = [...prev];
      let temp = updatedUsers.filter((user) => user.id !== memberId);
      return temp;
    });
  };

  // * handle member joined through rtm
  const handleMemberJoined = async (memberId) => {
    // ? getting the keys (info) from the user
    let { name, image } = await rtmClient.current.getUserAttributesByKeys(
      memberId,
      ["name", "image"]
    );

    setAllusers((prev) => [
      ...prev,
      {
        id: memberId,
        name: name,
        image: image,
      },
    ]);
  };

  // * controlling the volume indicator
  const initVolumeIndicator = () => {
    AgoraRTC.current.setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200);
    rtcClient.current.enableAudioVolumeIndicator();

    rtcClient.current.on("volume-indicator", (volumes) => {
      volumes.forEach((volume) => {
        try {
          let item = document.getElementsByClassName(
            `user-chat-box-rtcUid-${volume.uid}`
          )[0];

          if (volume.level >= 55) {
            item?.classList.add("active-user-chat");
          } else {
            item?.classList.remove("active-user-chat");
          }
        } catch (error) {
          console.error(error);
        }
      });
    });
  };

  // * toggling the mute/unmute button

  const toggleMute = () => {
    if (localMute) {
      setLocalMute(false);
      audioTracks.localAudioTrack.setMuted(false);
    } else {
      setLocalMute(true);
      audioTracks.localAudioTrack.setMuted(true);
    }
  };

  // console.log("all users:", allUsers);
  // console.log("user profile:", userProfile);

  return (
    <div className="live-chat-fansty-league" id="chat-box">
      {/* Local info buttons for users  */}
      <div className="infoButtons">
        <div
          className={localMute ? "mute-btn muted" : "mute-btn"}
          onClick={toggleMute}
        >
          <Image
            className="mute-img"
            src={localMute ? micMute : micUnmute}
            alt="unmute"
          />
        </div>
        <div className="leave-room">
          <button onClick={leaveRoom} className="btn btn--sec">
            Leave Room
          </button>
        </div>
      </div>

      {/* User Wrapper  */}
      {call ? (
        <div className="user-wrap">
          {/* ! UI of the user */}
          {allUsers?.length ? (
            allUsers.map((user) => (
              <ChatUser
                id={user.id}
                name={user.name}
                image={user.image}
                key={user.id}
                userChat={userChat}
              />
            ))
          ) : (
            // <div>No user found</div>
            <div></div>
          )}
        </div>
      ) : (
        <div className="callLeft">
          <p> You have left the call</p>
          <button
            onClick={() => {
              initRtm("testing", "");
              initRtc();
            }}
            className="btn btn--pri"
          >
            Rejoin Call
          </button>
        </div>
      )}
    </div>
  );
};

export default Audio;

const ChatUser = ({ id, name, image, userChat }) => {
  return (
    <div
      className={`user-chat-box user-chat-box-rtcUid-${id}`}
      id="user-chat-box"
      ref={userChat}
    >
      {image ? (
        <span className="chat-user-image">
          <Image src={image} alt="profile" height="850" width="850" />
        </span>
      ) : (
        <p className="profileNameInitialNav">{id}</p>
      )}

      <p className="chat-user-details">
        <span className="name">{name?.trim().split(" ")[0]}</span>
        {/* <p style={{ fontSize: "2rem" }}>{id}</p> */}
      </p>
    </div>
  );
};

export { ChatUser };
