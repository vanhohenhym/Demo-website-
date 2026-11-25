import React from "react";
import Link from "next/link";

export interface EditorialSeoSectionProps {
  includeMiddleSections?: boolean;
  includeClosingSection?: boolean;
}

function EditorialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[#c83712] underline decoration-[#c83712]/55 underline-offset-2 transition-colors hover:text-brand-orange hover:decoration-brand-orange focus-visible:rounded-sm"
    >
      {children}
    </Link>
  );
}

export function EditorialSeoSection({
  includeMiddleSections = false,
  includeClosingSection = false,
}: EditorialSeoSectionProps) {

  return (
    <section
      aria-labelledby="editorial-seo-heading"
      className="space-y-6 pb-4 pt-2 text-[13px] leading-[1.75] text-[#1f2937]"
    >
      {/* Intro Block (Image 7 — Section 1) */}
      <div>
        <h2
          id="editorial-seo-heading"
          className="mb-2.5 text-xl font-normal tracking-tight text-brand-textMain sm:text-[22px] sm:font-medium"
        >
          Leading Computer, Laptop &amp; Electronics Retail &amp; Online Shop in Bangladesh
        </h2>
        <p>
          Technology has become a part of our daily lives, and we depend on electronic products
          daily for a vast portion of our lives. There is hardly a home in Bangladesh without an
          electronic product. This is where we come in.{" "}
          <EditorialLink href="/contact">Star Tech Ltd.</EditorialLink> started as a Tech Product
          Shop in March 2007 and has since grown into a{" "}
          <strong className="font-semibold text-brand-textMain">
            one-stop Electronics Shop in Bangladesh
          </strong>{" "}
          with a wide range of categories. We focus on giving the best customer service in
          Bangladesh, following our motto of{" "}
          <strong className="font-semibold text-brand-textMain">
            &ldquo;Customer Comes First&rdquo;
          </strong>
          . This is why Star Tech is the most{" "}
          <strong className="font-semibold text-brand-textMain">
            trusted computer shop in Bangladesh
          </strong>{" "}
          today, capturing the loyalty of a large customer base. After a long 16-year journey, in
          2022, Star Tech Ltd. was certified with the renowned{" "}
          <strong className="font-semibold text-brand-textMain">
            &ldquo;ISO 9001:2015 certification&rdquo;
          </strong>{" "}
          as a recognition for the best Quality Control Management System. As an{" "}
          <strong className="font-semibold text-brand-textMain">
            ISO-certified organization
          </strong>
          , Star Tech Ltd. is now up to the international standards that specify a Quality
          Management System (QMS). This Certification denotes that the organization strictly
          maintains all sorts of regulatory requirements to provide customers with products and
          services of a global standard.
        </p>
      </div>

      {/* Laptop Block (Image 7 — Section 2) */}
      <div>
        <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
          Best Laptop Shop in Bangladesh
        </h3>
        <p>
          Star Tech is the most popular{" "}
          <EditorialLink href="/category/laptop">Laptop Brand Shop in BD</EditorialLink>. Star Tech{" "}
          <EditorialLink href="/category/laptop">Laptop Shop</EditorialLink> has the perfect
          device, whether you are a freelancer, officegoer, or student. Gamers love our collection
          of <EditorialLink href="/category/gaming">Gaming Laptops</EditorialLink> because we
          always bring the latest laptops in Bangladesh. As the best laptop shop in BD, a
          customer&rsquo;s budget is our first concern. We bring the latest Intel laptops and AMD
          laptops under budget for every customer - from starters to expert users. Star Tech is
          considered the most trusted laptop shop in BD, allowing you to buy the best laptops from
          top laptop brands in the world. Along with the best laptop brands, our experts provide
          you with the best buying decisions based on your needs and budget - making Star Tech the
          trusted and most popular laptop shop in Bangladesh. Star Tech lets you buy an official
          Apple MacBook Air, MacBook Pro, or MacBook Neo from{" "}
          <EditorialLink href="/category/laptop/apple">
            Apple Store in Bangladesh
          </EditorialLink>
          . Star Tech sells the latest models of the most popular laptop brands, such as -{" "}
          <EditorialLink href="/category/laptop/hp">HP</EditorialLink>, Dell,{" "}
          <EditorialLink href="/category/laptop/apple">Apple MacBook</EditorialLink>,{" "}
          <EditorialLink href="/category/laptop/asus">Asus</EditorialLink>,{" "}
          <EditorialLink href="/category/laptop/acer">Acer</EditorialLink>,{" "}
          <EditorialLink href="/category/laptop/lenovo">Lenovo</EditorialLink>,{" "}
          <EditorialLink href="/category/laptop/microsoft">Microsoft Surface</EditorialLink>, MSI,
          Gigabyte, <EditorialLink href="/category/laptop/walton">Walton</EditorialLink>, Xiaomi,
          Huawei, Chuwi, etc.
        </p>
      </div>

      {/* Desktop PC Block (Image 7 — Section 3) */}
      <div>
        <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
          Best Desktop PC Shop In Bangladesh
        </h3>
        <p>
          <EditorialLink href="/">Star Tech</EditorialLink> has the most comprehensive array of{" "}
          <EditorialLink href="/category/desktop">Desktop PCs</EditorialLink>. We offer
          top-of-the-line Custom PC,{" "}
          <EditorialLink href="/category/desktop">Brand PC</EditorialLink>, All-in-One PC, and{" "}
          <EditorialLink href="/category/desktop">Portable Mini PC</EditorialLink> at Star Tech
          outlets, the trusted and most popular Desktop PC shop in Bangladesh, which are spread
          nationwide. Get your new{" "}
          <EditorialLink href="/category/desktop/apple">Apple iMac</EditorialLink> Desktop or{" "}
          <EditorialLink href="/category/desktop/apple">Apple Mac Mini</EditorialLink> with an
          international warranty and servicing plan. You can always depend on the Star Tech PC shop
          experts to build the best desktop PC or computer with parts of your choice. Star Tech is
          Bangladesh&rsquo;s most reliable repair shop for PC, laptops, &amp; other consumer
          electronics. Take your gaming or professional content creation to the next level with a
          large collection of high end Gaming PC and Editing PC from Star Tech. You can build a
          complete personal computer with the best desktop PC parts picked by you with our{" "}
          <EditorialLink href="/pc-builder">PC Builder</EditorialLink> feature. The feature lets
          you <EditorialLink href="/category/component">pick PC parts</EditorialLink> to buy the
          best Desktop PC anytime. Or, you can visit any Star Tech custom PC shop near you to build
          the best Desktop PC according to your taste, live, and in front of you.
        </p>
      </div>

      {/* Middle Editorial Sections (Image 8 — Mini-Phase 8) */}
      {includeMiddleSections ? (
        <>
          {/* Office Equipment & Networking Bridge Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Best Office Equipment Shop in Bangladesh
            </h3>
            <p>
              Star Tech also serves corporate workspaces and institutions with reliable{" "}
              <EditorialLink href="/category/camera">Cameras</EditorialLink>,{" "}
              <EditorialLink href="/category/office-equipment">Printers</EditorialLink>,{" "}
              <EditorialLink href="/category/networking">Routers</EditorialLink>, Photocopiers,
              Attendance Machines, Scanners, Conference Systems, Server Equipment, etc. for smooth
              office operation.
            </p>
          </div>

          {/* Gadget Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Largest Gadget Shop In Bangladesh
            </h3>
            <p>
              We bring in the most sought-after{" "}
              <EditorialLink href="/category/gadget">gadgets</EditorialLink> at Star Tech. Only
              genuine and leading brands of{" "}
              <EditorialLink href="/category/gadget">Smart Watch</EditorialLink>,{" "}
              <EditorialLink href="/category/accessories">Earbuds</EditorialLink>,{" "}
              <EditorialLink href="/category/power">Power Bank</EditorialLink>, and Smart
              Accessories are available at our Gadget Shop. We are also concerned for creative
              professionals for whom we bring exciting gadgets like Drones, Studio Equipment,{" "}
              <EditorialLink href="/category/camera">DSLR Camera</EditorialLink>,{" "}
              <EditorialLink href="/category/camera">Gimbals</EditorialLink> &amp; Stream Decks
              from internationally reputed brands like DJI, Blackmagic, Corsair, Zhiyun, and
              Gudsen. Star Tech has established the largest gadget shop in BD with the help of an
              app &amp; E-commerce website. Ease up your chores with smart gadgets from our gadget
              shop. Xiaomi, Anker, Micropack, Vention, UGREEN, OnePlus, Apple, Baseus, Orico,
              Havit, Samsung, and HOCO are a few of the brands we cover.
            </p>
          </div>

          {/* Mobile Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Top Mobile Shop in Bangladesh
            </h3>
            <p>
              Star Tech <EditorialLink href="/category/phone">mobile phone</EditorialLink> shop
              offers the latest smartphones and{" "}
              <EditorialLink href="/category/phone">feature phones</EditorialLink> from top mobile
              brands. <EditorialLink href="/category/phone/samsung">Samsung</EditorialLink>,
              Motorola, Google Pixel,{" "}
              <EditorialLink href="/category/phone/vivo">Vivo</EditorialLink>, Huawei,{" "}
              <EditorialLink href="/category/phone/xiaomi">Xiaomi Redmi</EditorialLink>,{" "}
              <EditorialLink href="/category/phone/oppo">OPPO</EditorialLink>, Realme, and{" "}
              <EditorialLink href="/category/phone/oneplus">OnePlus</EditorialLink> are among the
              Android smartphone brands at our mobile shop. Star Tech is a one-stop solution for
              buying <EditorialLink href="/category/phone/apple">iPhones</EditorialLink> in
              Bangladesh. Star Tech is also your go-to destination for buying the latest Android
              tablets and <EditorialLink href="/category/tablet/apple">iPads</EditorialLink> in
              Bangladesh. Offering extensive warranty, EMI &amp; home delivery service spanning the
              country, we are the top <EditorialLink href="/category/phone">mobile</EditorialLink>{" "}
              shop in Bangladesh, presenting the best online shop for mobile phones. Our mobile
              phone shop has an extensive collection of{" "}
              <EditorialLink href="/category/accessories">mobile phone accessories</EditorialLink>,
              including chargers, USB Type-C Cables, Power Banks, Wireless Chargers, and many more
              to go with your smartphone.
            </p>
          </div>

          {/* Home Appliance Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Best Home Appliance Shop in Bangladesh
            </h3>
            <p>
              Star Tech is a popular appliance shop in Bangladesh with a variety of top-quality
              home appliances, including{" "}
              <EditorialLink href="/category/appliance">smart TVs</EditorialLink>,{" "}
              <EditorialLink href="/category/appliance">air conditioners</EditorialLink>,{" "}
              <EditorialLink href="/category/appliance">washing machines</EditorialLink>,
              refrigerators, <EditorialLink href="/category/appliance">geysers</EditorialLink>,
              vacuum cleaners,{" "}
              <EditorialLink href="/category/appliance">sewing machines</EditorialLink>,{" "}
              <EditorialLink href="/category/appliance">electric room heaters</EditorialLink>, air
              purifiers, and more. Our kitchen appliance collection covers{" "}
              <EditorialLink href="/category/appliance">ovens</EditorialLink>,{" "}
              <EditorialLink href="/category/appliance">air fryers</EditorialLink>, rice cookers,{" "}
              <EditorialLink href="/category/appliance">blenders &amp; grinders</EditorialLink>,
              electric cookers,{" "}
              <EditorialLink href="/category/appliance">induction cookers</EditorialLink>, and
              other everyday essentials. Star Tech offers home appliances from renowned brands
              like Samsung, LG, Hitachi, Whirlpool, Singer, Haier,{" "}
              <EditorialLink href="/category/appliance/walton">Walton</EditorialLink>, and so on.
              To assist customers in selecting the appropriate air conditioner, Star Tech has an{" "}
              <EditorialLink href="/category/appliance">AC Ton Calculator</EditorialLink>, helping
              determine the ideal AC capacity based on room size and other factors. Star Tech
              focuses on the evolving needs of modern households and ensures best quality Home and
              Kitchen Appliance at best price in Bangladesh.
            </p>
          </div>

          {/* Lifestyle & Healthcare Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Best Lifestyle &amp; Healthcare Products Shop in Bangladesh
            </h3>
            <p>
              Star Tech brings modern electronics into everyday living with a growing collection of{" "}
              <EditorialLink href="/category/lifestyle">lifestyle products</EditorialLink> in BD.
              Look after your family&rsquo;s well-being at home with health monitors like{" "}
              <EditorialLink href="/category/lifestyle">Blood Pressure Monitors</EditorialLink>,
              Glucometers, Digital Thermometers, Pulse Oximeters, Nebulizers, Body Weight Scales,
              and other healthcare devices. Our lifestyle range also includes{" "}
              <EditorialLink href="/category/lifestyle">Massagers</EditorialLink>,{" "}
              <EditorialLink href="/category/lifestyle">Trimmers</EditorialLink>, Hair Dryers,
              Electric Toothbrush, and other personal care and daily-use products. Only original
              products from trusted brands are available at Star Tech Lifestyle Shop. Star Tech
              offers authentic lifestyle products and medical equipment from world class brands
              like Omron, Microlife, Beurer, Philips, Panasonic, Braun, Xiaomi, and so on.
            </p>
          </div>

          {/* Trusted E-Commerce Website Block */}
          <div>
            <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
              Trusted Online Shopping From Bangladesh at The Best E-Commerce Website
            </h3>
            <p>
              Star Tech believes the most in customer satisfaction. To meet the surging demand for
              online shopping from Bangladesh, we launched our{" "}
              <EditorialLink href="/">E-Commerce</EditorialLink> website. Our highly trusted online
              shop has been regarded as one of the best E-Commerce websites with most visits. Star
              Tech is revolutionizing online shopping in Bangladesh, featuring a brilliant search
              engine that helps our valued customers find their desired tech,{" "}
              <EditorialLink href="/category/gaming">gaming</EditorialLink> gear, and custom rigs
              with ease. From our interactive{" "}
              <EditorialLink href="/pc-builder">PC Builder</EditorialLink> tool to seasonal
              nationwide campaigns and fast 64-district delivery, Star Tech makes genuine tech
              shopping simple and dependable across Bangladesh.
            </p>
          </div>
        </>
      ) : null}

      {/* Closing Editorial Block (Image 9 — Mini-Phase 9) */}
      {includeClosingSection ? (
        <div>
          <h3 className="mb-2 text-base font-medium text-brand-textMain sm:text-[17px]">
            Best Price, Product, After-sales Customer Service, &amp; Fastest Delivery
          </h3>
          <p>
            Star Tech Ltd. has taken care of its customers since the beginning. Whether a customer
            is purchasing or inquiring, our customers get the highest priority. We deliver the best
            product for the best price with extended after-sales support &amp; the highest standard
            of customer service. We{" "}
            <EditorialLink href="/category/component">offer</EditorialLink> your desired product
            within the fastest delivery timeframe. With our nationwide presence, we cover all 64
            districts of Bangladesh. Our distribution hubs are located in Dhaka, Chattogram,
            Khulna, Rangpur, Gazipur, Rajshahi, and Mymensingh. We also have over 15 dedicated{" "}
            <EditorialLink href="/contact">service centers</EditorialLink> and are proud to offer{" "}
            <EditorialLink href="/contact">computer home service</EditorialLink> for the first time
            in Bangladesh. The plan to expand our operations in other cities is already in motion.
          </p>
        </div>
      ) : null}
    </section>
  );
}
