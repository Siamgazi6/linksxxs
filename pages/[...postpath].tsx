import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = 'https://dev-test8568.pantheonsite.io/graphql';
	const graphQLClient = new GraphQLClient(endpoint);
	
	const referringURL = ctx.req.headers?.referer || null;
	const fbclid = ctx.query.fbclid;
	
	// URL পাথ ঠিক করা
	const pathArr = ctx.query.postpath as Array<string>;
	const path = pathArr ? pathArr.join('/') : '';

	// User-Agent থেকে নিখুঁতভাবে চেক করা হচ্ছে যে এটি ফেসবুকের বট কিনা
	const userAgent = (ctx.req.headers['user-agent'] || '').toLowerCase();
	const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('facebot');

	// যদি ফেসবুকের বট না হয় (সাধারণ ইউজার হয়) এবং ফেসবুক থেকে আসে, তবেই রিডাইরেক্ট হবে
	if (!isFacebookBot && (referringURL?.includes('facebook.com') || fbclid)) {
		return {
			redirect: {
				permanent: false,
				destination: `https://saveourstateok.org/${encodeURI(path)}`,
			},
		};
	}

	const query = gql`
		{
			post(id: "/${path}/", idType: URI) {
				id
				excerpt
				title
				link
				dateGmt
				modifiedGmt
				content
				author {
					node {
						name
					}
				}
				featuredImage {
					node {
						sourceUrl
						altText
					}
				}
			}
		}
	`;

	let data: any;

	try {
		data = await graphQLClient.request(query);
	} catch (error) {
		console.error('GraphQL Error:', error);
		return {
			notFound: true,
		};
	}

	// ডেটাবেসে পোস্ট না থাকলে 404 দেখাবে
	if (!data || !data.post) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			path,
			post: data.post,
			host: ctx.req.headers.host || 'localhost',
		},
	};
};

interface PostProps {
	post: any;
	host: string;
	path: string;
}

const Post: React.FC<PostProps> = (props) => {
	const { post, host } = props;

	// excerpt থেকে ট্যাগ রিমুভ করার ফাংশন
	const removeTags = (str: string) => {
		if (!str) return '';
		return str.toString().replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '');
	};

	// ছবি আছে কি না তা সহজে চেক করার জন্য ভেরিয়েবল
	const imageUrl = post?.featuredImage?.node?.sourceUrl;
	const imageAlt = post?.featuredImage?.node?.altText || post?.title;

	return (
		<>
			<Head>
				<meta property="og:title" content={post.title} />
				<meta property="og:description" content={removeTags(post.excerpt)} />
				<meta property="og:type" content="article" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:site_name" content={host?.split('.')[0] || 'Website'} />
				<meta property="article:published_time" content={post.dateGmt} />
				<meta property="article:modified_time" content={post.modifiedGmt} />
				
				{/* ছবি থাকলে তবেই meta tag রেন্ডার হবে */}
				{imageUrl && (
					<>
						<meta property="og:image" content={imageUrl} />
						<meta property="og:image:alt" content={imageAlt} />
					</>
				)}
				<title>{post.title}</title>
			</Head>
			<div className="post-container">
				<h1>{post.title}</h1>
				
				{/* ছবি থাকলে তবেই img tag রেন্ডার হবে */}
				{imageUrl && (
					<img src={imageUrl} alt={imageAlt} />
				)}
				
				<article dangerouslySetInnerHTML={{ __html: post.content }} />
			</div>
		</>
	);
};

export default Post;
