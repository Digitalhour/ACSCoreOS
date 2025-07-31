import React, {useEffect, useRef} from 'react';
import SunEditor from 'suneditor';
import plugins from 'suneditor/src/plugins';
import 'suneditor/dist/css/suneditor.min.css';

interface SunEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: string;
    width?: string;
    className?: string;
}

export default function SunEditorComponent({
                                               value,
                                               onChange,
                                               placeholder = "Write your content here...",
                                               height = "400px",
                                               width = "100%",
                                               className = ""
                                           }: SunEditorProps) {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const sunEditorRef = useRef<any>(null);

    // Ref to track if the content change is from the editor's own onChange event
    const isInternalChange = useRef(false);

    // This hook manages the editor's creation and destruction
    useEffect(() => {
        if (!editorRef.current) return;

        // Create the editor instance
        sunEditorRef.current = SunEditor.create(editorRef.current, {
            plugins: plugins,
            height: height,
            width: width,
            placeholder: placeholder,
            value: value,

            pasteTagsWhitelist: "*",
            addTagsWhitelist: "*",
            attributesWhitelist: {
                global: 'id|style|class|data-*',
            },
            strictMode: false,
            strictHTMLValidation: false,
            "katex": "window.katex",
            "previewTemplate": "<div style='width:auto; max-width:1080px; margin:auto;'>    <h1>Preview Template</h1>     {{contents}}     <div>_Footer_</div></div>            ",
            templates: [

                {
                    name: 'News Paper 1 page',
                    html: '<div style="max-width: 800px; margin: 0 auto; font-family: \'Times New Roman\', serif; background: white; padding: 20px; box-sizing: border-box;"> \n' +
                        '<!-- Header --> \n' +
                        '<div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px;"> \n' +
                        '<h1 style="font-size: clamp(24px, 4vw, 36px); font-weight: bold; letter-spacing: 2px; margin: 0; padding: 0;">ACS NEWSLETTER</h1>\n' +
                        ' \n' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: clamp(12px, 2vw, 14px); flex-wrap: wrap; gap: 10px;"> <span><strong>Date:</strong> 12/11/2024</span> <span><strong>SCHOOL HOUSE</strong></span> <span><strong>Vol. No.:</strong> 2</span> </div>\n' +
                        ' </div>\n' +
                        ' \n' +
                        '<!-- Main Headline --> \n' +
                        '<div style="text-align: center; margin-bottom: 25px;"> \n' +
                        '<h2 style="font-size: clamp(20px, 3.5vw, 28px); font-weight: bold; letter-spacing: 1px; margin: 0; padding: 0;">SPRING BREAK AND UPCOMING EVENTS</h2>\n' +
                        ' </div>\n' +
                        ' \n' +
                        '<!-- Main Content Area --> \n' +
                        '<div style="overflow: hidden; margin-bottom: 25px;"> \n' +
                        '<!-- Left Section - Image and Credits --> \n' +
                        '<div style="float: left; width: 45%; margin-right: 5%;"> </div>\n' +
                        ' \n' +
                        '<!-- Right Section - Spring Festival Info --> \n' +
                        '<div style="float: left; width: 45%; margin-right: 5%;"> \n' +
                        '<div style="font-size: clamp(10px, 1.5vw, 12px); font-style: italic; line-height: 1.3;"> \n' +
                        '<p style="margin: 0px; padding: 0px;"><strong><meta charset="utf-8"></strong>\n' +
                        '<div class="se-component se-image-container __se__float-left" style="width: 100%;">\n' +
                        '            <figure style="width: 100%;">\n' +
                        '              <img src="https://placehold.co/600x400" alt="Students celebrating in classroom" style="width: 100%; height: auto; border: 2px solid #ccc; margin-bottom: 10px;" data-proportion="true" data-percentage="100%,auto" width="100%" height="auto" data-size="100%,auto" data-align="left" data-file-name="600x400" data-file-size="0" origin-size="600,400" data-origin="100%,auto" data-index="1">\n' +
                        '            </figure>\n' +
                        '</div>\n' +
                        '</p>\n' +
                        '\n' +
                        '<p style="margin: 0; padding: 0;"><strong>Written by:</strong> Jane Doe</p>\n' +
                        ' \n' +
                        '<p style="margin: 0; padding: 0;"><strong>Photo by:</strong> John Smith</p>\n' +
                        ' </div>\n' +
                        ' </div>\n' +
                        '\n' +
                        '<div style="float: right; width: 50%;"> \n' +
                        '<h3 style="font-size: clamp(16px, 2.5vw, 20px); font-weight: bold; margin: 0 0 15px 0; padding: 0;">Spring Festival Preparations</h3>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.4; margin: 0 0 15px 0; text-align: justify;">        Our Spring Festival is set for April 10th. Students are encouraged to participate in art and craft activities.      </p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.4; margin: 0; text-align: justify;">        The entire school will come together and celebrate the beauty of the spring season. With colorful decorations, lively performances, and engaging activities, the Spring Festival promises to be a day full of fun and creativity.      </p>\n' +
                        ' </div>\n' +
                        ' </div>\n' +
                        ' \n' +
                        '<!-- Article Section --> \n' +
                        '<div style="border-top: 2px solid #000; padding-top: 20px;"> \n' +
                        '<h2 style="font-size: clamp(18px, 3vw, 24px); font-weight: bold; margin: 0 0 20px 0; padding: 0;">SPRING BREAK AND FESTIVAL FUN AWAIT!</h2>\n' +
                        ' \n' +
                        '<!-- Article Content in Columns --> \n' +
                        '<div style="columns: 2; column-gap: 20px; column-rule: 1px solid #ccc; text-align: justify;"> \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.5; margin: 0 0 15px 0;">        Spring Break is fast approaching! From March 28th to April 4th, students and staff will enjoy a well-deserved break from the usual school routine. After months of hard work, it&apos;s time to recharge and have a step back to enjoy the warmer weather of the season. Whether you&apos;re planning a trip, spending time with family, or just taking a moment to relax, we hope everyone takes full advantage of this time off to rest and recharge.      </p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.5; margin: 0 0 15px 0;">        When we return from Spring Break, we&apos;ll dive straight into the excitement of our Spring Festival, which will be held on April 10th. This festival is always a highlight of the year and offers a chance for the entire school to come together and celebrate the beauty of the spring season. With colorful decorations, lively performances, and engaging activities, the Spring Festival promises to be a day full of fun and creativity.      </p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.5; margin: 0 0 15px 0;">        One of the key features of the festival is the Talent Show, where students are invited to showcase their skills—whether it&apos;s singing, dancing, acting, or anything that shows off your unique abilities. This is a great opportunity for students to gain confidence and share their talents with the whole school.      </p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(12px, 2vw, 14px); line-height: 1.5; margin: 0;">        In addition to the talent show, we will also have an Art Exhibit showcasing the amazing creativity of our students. From paintings and sculptures to photography and crafts, the exhibit will highlight the spring-inspired works of our talented artists.      </p>\n' +
                        ' </div>\n' +
                        ' </div>\n' +
                        '</div>\n' +
                        '\n' +
                        '<!-- Mobile Responsive Adjustments --><style>@media (max-width: 768px) {  div[style*=&quot;grid-template-columns: 1fr 1fr&quot;] {    display: block !important;  }    div[style*=&quot;columns: 2&quot;] {    columns: 1 !important;  }    div[style*=&quot;flex-wrap: wrap&quot;] {    justify-content: center !important;    text-align: center;  }}</style>\n'
                },
                {
                    name: 'Blitz Brief',
                    html: '<!-- Header Image -->\n' +
                        '<div class="se-component se-image-container __se__float-none" style="width: 100%;">\n' +
                        '  <figure style="width: 100%;">\n' +
                        '    <img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfI1p0J1vXWw0Bommlq-az6ZYwbJYcgnjn56VOO4vej3HGusnCA--_x_ZKV9y47PShcTsYRfREl0cJmKM0lEl17dd4tJgp-1Kx1D8Y1iGienTzuwWUNRW5RmGrK61qSJYZdEAZM?key=T42eGeNnJg8vL8eC-eEDgw" alt="ACS BlitzBrief Header" style="width: 100%; height: auto; display: block; margin-bottom: 20px;" data-proportion="true" data-percentage="100%,auto" width="100%" height="auto" data-size="100%,auto" data-align="none" data-file-name="AD_4nXfI1p0J1vXWw0Bommlq-az6ZYwbJYcgnjn56VOO4vej3HGusnCA--_x_ZKV9y47PShcTsYRfREl0cJmKM0lEl17dd4tJgp-1Kx1D8Y1iGienTzuwWUNRW5RmGrK61qSJYZdEAZM?key=T42eGeNnJg8vL8eC-eEDgw" data-file-size="0" origin-size="1600,466" data-origin="100%,auto" data-index="0">\n' +
                        '  </figure>\n' +
                        '</div>\n' +
                        '\n' +
                        '<div style="max-width: 900px; margin: 0 auto; font-family: Arial, sans-serif; background: white; line-height: 1.6;"> \n' +
                        '<!-- Main Content --> \n' +
                        '<div style="padding: 30px 20px;"> \n' +
                        '<!-- Title Section --> \n' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px;"> \n' +
                        '<h2 style="color: #e74c3c; font-size: clamp(24px, 4vw, 36px); font-weight: bold; margin: 0;">ACS Summer Kickoff</h2>\n' +
                        '\n' +
                        '<div style="font-size: clamp(18px, 3vw, 24px); font-weight: bold; color: #333;">July 2025</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Main Content Layout --> \n' +
                        '<div style="display: flex; gap: 30px; margin-bottom: 40px; flex-wrap: wrap;"> \n' +
                        '<!-- Left Column - Main Content --> \n' +
                        '<div style="flex: 2; min-width: 300px;"> \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); color: #555; margin-bottom: 20px; text-align: justify;">We wrapped up June at 89%, with strong momentum carrying us into summer. Right now, we have six (soon to be seven) new hires working through departmental rotations before landing in their final seats: several of them soon joining the sales force. On top of that, we&apos;ve got a stack of big, impactful projects queued up and ready to launch in the coming months.</p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); color: #555; margin-bottom: 20px; text-align: justify;">Summer might be heating up, but so is the action around ACS. From big promotions and recruiting adventures to new machinery and creative initiatives, our teams have been busy making moves (and sawdust over at Custom Mill). Here&apos;s a lightning round of updates to keep you in the loop (and maybe even inspire a few compressor-spotting road trips along the way).</p>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Right Column - Statistics Box --> \n' +
                        '<div style="flex: 1; min-width: 250px;"> \n' +
                        '<div style="border: 2px solid #e74c3c; border-radius: 8px; overflow: hidden;"> \n' +
                        '<div style="background: #e74c3c; color: white; padding: 15px; text-align: center;"> \n' +
                        '<h3 style="margin: 0; font-size: clamp(16px, 2.5vw, 20px); font-weight: bold;">June Results</h3>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div style="padding: 20px; background: #f8f9fa;"> \n' +
                        '<div style="margin-bottom: 15px;"><strong style="text-decoration: underline;">Total Revenue:</strong> $2,351,533.89<br>\n' +
                        '<span style="color: #28a745; font-weight: bold;">(89.23%)</span></div>\n' +
                        ' \n' +
                        '<div style="margin-bottom: 15px;"><strong style="text-decoration: underline;">Goal:</strong> $2,635,263.01</div>\n' +
                        ' \n' +
                        '<div style="margin-bottom: 15px;"><strong style="text-decoration: underline;">Parts:</strong> $2,073,529 <span style="color: #28a745;">(91.74%)</span></div>\n' +
                        ' \n' +
                        '<div style="margin-bottom: 20px;"><strong style="text-decoration: underline;">Service:</strong> $278,004.89 <span style="color: #dc3545;">(74.13%)</span></div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div style="background: #e74c3c; color: white; padding: 15px; text-align: center;"> \n' +
                        '<h3 style="margin: 0; font-size: clamp(16px, 2.5vw, 20px); font-weight: bold;">July Goals</h3>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div style="padding: 20px; background: #f8f9fa;"> \n' +
                        '<div style="margin-bottom: 10px;"><strong style="text-decoration: underline;">Total Goal:</strong> $2,782,452.14</div>\n' +
                        ' \n' +
                        '<div style="margin-bottom: 10px;"><strong style="text-decoration: underline;">Parts:</strong> $2,357,452.14</div>\n' +
                        ' \n' +
                        '<div><strong style="text-decoration: underline;">Service:</strong> $425,000</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Anniversaries and Birthdays Section --> \n' +
                        '<div style="display: flex; gap: 20px; margin-bottom: 40px; flex-wrap: wrap;"> \n' +
                        '<div style="flex: 1; min-width: 250px; background: #f1f1f1; padding: 20px; border-radius: 8px;"> \n' +
                        '<h3 style="margin: 0 0 20px 0; font-size: clamp(18px, 3vw, 22px); font-weight: bold; color: #333; border-bottom: 2px solid #666; padding-bottom: 10px;">July Anniversaries</h3>\n' +
                        ' \n' +
                        '<div style="font-size: clamp(14px, 2vw, 16px); line-height: 1.8;"> \n' +
                        '<div><strong>7/5</strong> - Rianna Lewis</div>\n' +
                        '\n' +
                        '<div><strong>7/17</strong> - Tim Kesting</div>\n' +
                        '\n' +
                        '<div><strong>7/19</strong> - Patrick Roth</div>\n' +
                        '\n' +
                        '<div><strong>7/25</strong> - Christine Francis</div>\n' +
                        '\n' +
                        '<div><strong>7/25</strong> - Dana Thames</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div style="flex: 1; min-width: 250px; background: #f1f1f1; padding: 20px; border-radius: 8px;"> \n' +
                        '<h3 style="margin: 0 0 20px 0; font-size: clamp(18px, 3vw, 22px); font-weight: bold; color: #333; border-bottom: 2px solid #666; padding-bottom: 10px;">July Birthdays</h3>\n' +
                        ' \n' +
                        '<div style="font-size: clamp(14px, 2vw, 16px); line-height: 1.8;"> \n' +
                        '<div><strong>7/1</strong> - Daniel Mogos</div>\n' +
                        '\n' +
                        '<div><strong>7/7</strong> - Neal Shade</div>\n' +
                        '\n' +
                        '<div><strong>7/14</strong> - Abby Jones</div>\n' +
                        '\n' +
                        '<div><strong>7/17</strong> - Jon Blair</div>\n' +
                        '\n' +
                        '<div><strong>7/28</strong> - John Stegall</div>\n' +
                        '\n' +
                        '<div><strong>7/31</strong> - Steve Edwards</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Project Update Section --> \n' +
                        '<div style="margin-bottom: 40px;"> \n' +
                        '<h2 style="color: #e74c3c; font-size: clamp(24px, 4vw, 32px); font-weight: bold; margin-bottom: 20px;">Meyer Center Cleanout: Phase Two Under Way</h2>\n' +
                        ' \n' +
                        '<div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;"> \n' +
                        '<div style="flex: 2; "> \n' +
                        '<h3 style="font-size: clamp(18px, 3vw, 22px); font-weight: bold; color: #333; margin-bottom: 15px;">Meyer Center Storage Room: Shelving Nearly Complete</h3>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); color: #555; margin-bottom: 15px; text-align: justify;">The &quot;Meyer Center Alpha Squadron&quot; is nearly done with their mission and we&apos;re not talking about a few wobbly garage shelves here. Led by Tim (our resident engineer and official &quot;Why is that not level?&quot; inspector), this cross-company dream team has been busy transforming the newly cleared-out storage room into a highly functional space.</p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); color: #555; margin-bottom: 15px; text-align: justify;">These shelves aren&apos;t just storage; they&apos;re a monument to sweat equity, teamwork, and the occasional unsolicited lesson in nail gun etiquette. The project is almost ready for its big reveal, and it&apos;s already shaping up to serve the Meyer Center far better than the dusty maze of boxes that once lived there.</p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); color: #555; text-align: justify;">Huge thanks to Tim and the entire Alpha Squadron for putting in the elbow grease and bringing these shelves to life. We can&apos;t wait to show off the final product!</p>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div class="se-component se-image-container __se__float-">\n' +
                        '          <figure style="width: 273px;">\n' +
                        '            <img src="https://placehold.co/300x400/" alt="Meyer Center construction project" data-proportion="true" width="273" height="364" data-size="273px,364px" data-align="" data-file-name="" data-file-size="0" origin-size="300,400" data-origin="273px,364px" style="width: 273px; height: 364px;" data-index="1">\n' +
                        '          </figure>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Lightning Round Section --> \n' +
                        '<div style="margin-bottom: 40px;"> \n' +
                        '<h2 style="color: #e74c3c; font-size: clamp(24px, 4vw, 32px); font-weight: bold; margin-bottom: 20px;">ACS Blitz: Lightning Round</h2>\n' +
                        ' \n' +
                        '<div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 25px;"> \n' +
                        '<div style="flex: 1; min-width: 200px;">' +
                        '<div class="se-component se-image-container __se__float-" style="width: 100%;">\n' +
                        '            <figure style="width: 100%;">\n' +
                        '              <img src="https://placehold.co/400x300">\n' +
                        '            </figure>\n' +
                        '</div>\n' +
                        ' </div>\n' +
                                 '<div style="flex: 2; min-width: 300px;"> \n' +
                        '            <ul style="font-size: clamp(14px, 2vw, 16px); color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">\n' +
                        '              <li><strong>Greg</strong> and <strong>Natalie</strong> are on the ACS recruiting trail! Greg recently attended a collegiate recruiting fair at the Hartness Hotel, connecting with intern and career coordinators.</li>\n' +
                        '              <li>New hires consistently praise <strong>Sam Kirkland</strong> for his thoroughness and kindness during warehouse training.</li>\n' +
                        '              <li><strong>David Nichols</strong> has been promoted to Key Account Manager! Big congrats on this well-deserved move!</li>\n' +
                        '              <li><strong>Chloe Burnett</strong> is transitioning from Customer Support to Inside Sales, bringing her product knowledge and problem-solving skills.</li>\n' +
                        '              <li><strong>Patrick</strong> and <strong>Eddie</strong> both closed Q2 strong - Patrick at 125% to goal, Eddie at 108.6% to goal.</li>\n' +
                        '            </ul>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Additional Updates --> \n' +
                        '<div style="columns: 2; column-gap: 30px; column-rule: 1px solid #ddd;"> \n' +
                        '<div style="break-inside: avoid; margin-bottom: 20px;"> \n' +
                        '<h4 style="color: #e74c3c; font-weight: bold; margin-bottom: 10px;">🎯 New Sales Records from June:</h4>\n' +
                        ' \n' +
                        '            <ul style="font-size: clamp(13px, 1.8vw, 15px); margin: 0; padding-left: 15px;">\n' +
                        '              <li>NEW Highest Bookings in a Month YTD - David Nichols: $356,352</li>\n' +
                        '              <li>NEW Highest Parts Sales in a Day - $168,018 (June 3rd)</li>\n' +
                        '              <li>Highest Bookings YTD - David Nichols: $1,779,527</li>\n' +
                        '              <li>Most Repeat Business YTD - Patrick Roth: $1,439,337</li>\n' +
                        '            </ul>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<div style="break-inside: avoid; margin-bottom: 20px;"> \n' +
                        '<h4 style="color: #e74c3c; font-weight: bold; margin-bottom: 10px;">🚀 Innovation Updates:</h4>\n' +
                        ' \n' +
                        '            <ul style="font-size: clamp(13px, 1.8vw, 15px); margin: 0; padding-left: 15px;">\n' +
                        '              <li>Corporate Ape now has 808 followers (100+ new per week)</li>\n' +
                        '              <li>ACS GO! App submitted to Apple for approval</li>\n' +
                        '              <li>New KAKA horizontal bandsaw installed - cuts 10&quot; round steel</li>\n' +
                        '              <li>Vibetrack prototypes reporting data to cloud via cellular</li>\n' +
                        '              <li>Second CNC part complete - discharge tube manufacturing mold</li>\n' +
                        '            </ul>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' \n' +
                        '<!-- Holiday Section --> \n' +
                        '<div> \n' +
                        '<h2 style="color: white; font-size: clamp(24px, 4vw, 32px); font-weight: bold; margin-bottom: 20px;">Happy Independence Day</h2>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 18px); margin-bottom: 15px; max-width: 600px; margin-left: auto; margin-right: auto;">ACS will be closed to observe Independence Day this Friday, July 4th. We want to wish you and your families a safe, fun, and memorable holiday weekend.</p>\n' +
                        ' \n' +
                        '<p style="font-size: clamp(14px, 2vw, 16px); max-width: 700px; margin-left: auto; margin-right: auto;">We&apos;re grateful to live and work in a country where we&apos;re free to express our beliefs, chase big ideas, and build something meaningful together. ACS is truly one of the best places to work in America. <strong>Happy Fourth of July!</strong></p>\n' +
                        ' \n' +
                        '<div style="margin-top: 20px;"> </div>\n' +
                        '\n' +
                        '<div class="se-component se-image-container __se__float-">\n' +
                        '          <figure style="width: 300px;">\n' +
                        '            <img src="https://placehold.co/300x200" >\n' +
                        '          </figure>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        '</div>\n' +
                        ' </div>\n '
                }
            ],
            buttonList: [
                // default
                ['undo', 'redo'],
                [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['fontColor', 'hiliteColor', 'textStyle'],
                ['removeFormat'],
                ['outdent', 'indent'],
                ['align', 'horizontalRule', 'list', 'lineHeight'],
                ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template'],
                ['-right', ':r-More Rich-default.more_plus', 'table', 'math', 'imageGallery'],
                ['-right', 'image', 'video', 'audio', 'link'],
                // (min-width: 992)
                ['%992', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    ['bold', 'underline', 'italic', 'strike'],
                    [':t-More Text-default.more_text', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle'],
                    ['removeFormat'],
                    ['outdent', 'indent'],
                    ['align', 'horizontalRule', 'list', 'lineHeight'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template'],
                    ['-right', ':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery']
                ]],
                // (min-width: 767)
                ['%767', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    [':t-More Text-default.more_text', 'bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle'],
                    ['removeFormat'],
                    ['outdent', 'indent'],
                    [':e-More Line-default.more_horizontal', 'align', 'horizontalRule', 'list', 'lineHeight'],
                    [':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template']
                ]],
                // (min-width: 480)
                ['%480', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    [':t-More Text-default.more_text', 'bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle', 'removeFormat'],
                    [':e-More Line-default.more_horizontal', 'outdent', 'indent', 'align', 'horizontalRule', 'list', 'lineHeight'],
                    [':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template']
                ]]
            ],
        });

        // Attach the onChange handler
        sunEditorRef.current.onChange = (contents: any) => {
            const stringContent = typeof contents === 'string' ? contents : '';

            isInternalChange.current = true;
            onChange(stringContent);
        };

        // Cleanup function to destroy the editor instance
        return () => {
            if (sunEditorRef.current) {
                sunEditorRef.current.destroy();
                sunEditorRef.current = null;
            }
        };
    }, []);

    // This hook syncs changes from the parent component back to the editor
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        if (sunEditorRef.current && sunEditorRef.current.getContents() !== value) {
            sunEditorRef.current.setContents(value || '');
        }
    }, [value]);


    return React.createElement('div', {
        className: className
    }, React.createElement('textarea', {
        ref: editorRef,
        style: { visibility: 'hidden' }
    }));
}
