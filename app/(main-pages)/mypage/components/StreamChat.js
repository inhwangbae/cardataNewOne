"use client";
import { useCallback, useState, useEffect } from "react";
import {
  Chat,
  useCreateChatClient,
  useChatContext,
  ChannelList,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
} from "stream-chat-react";
import { Link,Image, Button, Input, Spinner, Card } from "@nextui-org/react";
import { createToken } from "@/lib/action";
import "stream-chat-react/dist/css/v2/index.css";
import { Streami18n } from "stream-chat-react";
import { createClient } from "@/utils/supabase/client";

function StreamChat({ dictionary, userData, language, defaultLanguage }) {
  const [channelName, setChannelName] = useState("");
  const [activeChannel, setActiveChannel] = useState(null);
  const [carData, setCarData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [carSpec, setCarSpec] = useState("");
  const supabase = createClient();
  useEffect(() => {
    const fetchCarData = async () => {
      const parts = channelName.split("_");
      if (parts.length < 2) return;

      const carId = parts[parts.length - 2];
      try {
        const { data, error } = await supabase
          .from("cardata")
          .select("*")
          .eq("id", carId)
          .single();

        if (error) {
          console.error("Error fetching car data:", error);
          return;
        }

        setCarData(data);

        setCarSpec(
          [
            parseInt(carData?.mileage).toString() + "km",
            parseInt(carData?.year),
            carData?.fuelType?.[language],
            carData?.carCategory?.[language],
            carData?.dsp?.[language],
            carData?.trns?.[language],
            carData?.clr?.[language],
            carData?.inqCrrgsnb,
          ].join(" • ")
        );

        setIsLoading(true);
      } catch (error) {
        console.error("Error fetching car data:", error);
      }
    };

    fetchCarData();
  }, [channelName]);

  console.log("carData:", carData);

  const i18nInstance = new Streami18n({
    language: userData.language || "ko",
    translationsForLanguage: {
      // 필요한 번역을 여기에 추가할 수 있습니다
    },
  });

  const tokenProvider = useCallback(async () => {
    return await createToken(userData.id);
  }, [userData.id, createToken]);

  const client = useCreateChatClient({
    apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY,
    tokenOrProvider: tokenProvider,
    userData,
  });

  const sort = { last_message_at: -1 };
  const filters = {
    type: "messaging",
    members: { $in: [userData.id] },
  };
  const options = {
    limit: 10,
  };

  const showAllChannels = async () => {
    try {
      const channels = await client.queryChannels(filters, sort, options);
      console.log(
        "모든 채널 목록:",
        channels.map((channel) => ({
          id: channel.id,
          name: channel.data.name,
          members: channel.data.member_count,
          lastMessage: channel.state.last_message_at,
        }))
      );
    } catch (error) {
      console.error("채널 목록 조회 중 오류 발생:", error);
    }
  };

  const deleteChannel = async (channel, e) => {
    try {
      // 버튼 클릭 이벤트가 상위로 전파되는 것을 방지
      e.stopPropagation();

      await channel.delete();
      if (activeChannel?.cid === channel.cid) {
        setActiveChannel(null);
      }
      // alert("채널이 삭제되었습니다.");
    } catch (error) {
      console.error("채널 삭제 중 오류 발생:", error);
      alert("채널 삭제 중 오류가 발생했습니다.");
    }
  };

  // CustomChannelPreview 컴포넌트 수정
  const CustomChannelPreview = (props) => {
    const { channel, setActiveChannel, setChannelName } = props;
    return (
      <div
        className="p-4 border-b hover:bg-gray-100 cursor-pointer relative"
        onClick={() => {
          setActiveChannel(channel);
          setChannelName(channel?.data?.name || "이름 없는 채널");
        }}
      >
        <div className="font-bold text-lg">
          {channel?.data?.name || "이름 없는 채널"}
        </div>
        <div className="flex justify-end items-center">
          <Button
            size="sm"
            color="danger"
            variant="bordered"
            className="bg-red-500 text-red-500"
            onClick={(e) => deleteChannel(channel, e)}
          >
            삭제
          </Button>
        </div>
      </div>
    );
  };

  if (!client) {
    return (
      <div className="flex w-full h-full justify-center items-center">
        {/* <Spinner label="Loading..." color="warning"></Spinner> */}
      </div>
    );
  }

  console.log("activeChannel:", activeChannel);

  return (
    <Card className="flex w-full h-full mt-5 p-5 ">
      <Chat
        client={client}
        theme="str-chat__theme-custom"
        i18nInstance={i18nInstance}
      >
        <div className="grid grid-cols-3 w-full">
          <div className="col-span-1 ">
            <ChannelList
              className="w-full"
              filters={filters}
              sort={sort}
              options={options}
              Preview={(props) => (
                <CustomChannelPreview
                  {...props}
                  setActiveChannel={setActiveChannel}
                  setChannelName={setChannelName}
                />
              )}
              // onSelect={handleChannelSelect} // Add this line
            />
          </div>
          <div className="col-span-2 ">
            <Channel channel={activeChannel} className="w-full">
              <Window className="w-full">
                {carData && !isLoading ? (
                  <div className="flex px-10 gap-x-5">
                    <Image
                      alt="Card background"
                      className="object-cover rounded-xl"
                      src={carData?.uploadedImageUrls[0]?.url}
                      width={100}
                      height={100}
                    />
                    <div className="flex flex-col justify-center items-start px-10 w-full gap-y-5">
                      {carData.platform === "SKEncar" ? (
                        <>
                          <div className="text-lg font-bold">
                            {carData.title[language]}
                          </div>
                          <div className="text-medium text-gray-500">
                            {carSpec}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-lg font-bold">
                            {carData?.titlePo[language]}
                          </div>
                          <div className="text-medium text-gray-500">
                            {`${carData.modelYearPo} · ${carData.mileagePo}km · ${carData.isAccidentPo[language]} · ${carData.carNoPo}`}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
                {/* <ChannelHeader className="w-full" /> */}
                {activeChannel && (
                  <>
                    <div className="flex px-10 gap-x-5 justify-center items-center">
                      <Image
                        alt="Card background"
                        className="object-cover rounded-xl"
                        src={carData?.uploadedImageUrls[0]?.url}
                        width={100}
                        height={100}
                      />
                      <div className="flex flex-col justify-center items-start px-10 w-full gap-y-1">
                        {carData?.platform === "SKEncar" && carData ? (
                          <>

                            <div className="text-lg font-bold">
                              <Link target="_blank" href={`/list/${carData?.id}`}>{carData?.title?.[language]}</Link>
                            </div>
                            <div className="text-medium text-gray-500">
                              {carSpec}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold">
                              {carData?.titlePo[language]}
                            </div>
                            <div className="text-medium text-gray-500">
                              {`${carData?.modelYearPo} · ${carData?.mileagePo}km · ${carData?.isAccidentPo[language]} · ${carData?.carNoPo}`}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <MessageList className="w-full" />
                    <MessageInput className="w-full" />
                  </>
                )}
              </Window>
              <Thread />
            </Channel>
          </div>
        </div>
      </Chat>
    </Card>
  );
}

export default StreamChat;
