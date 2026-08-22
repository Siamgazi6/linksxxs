import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = 'https://dev-test8568.pantheonsite.io/graphql';
	const graphQLClient = new GraphQLClient(endpoint);
	const referringURL = ctx.req.headers?.referer || null;
	
	// User-Agent থেকে চেক করা হচ্ছে যে এটি ফেসবুকের বট কিনা
	const userAgent = ctx.req.headers['user-agent'] || '';
	const isFacebookBot = userAgent.includes('facebookexternalhit');

	const pathArr = ctx.query.postpath as Array<string>;
	const path = pathArr.join('/');
	const fbclid = ctx.query.fbclid;

	// যদি ফেসবুকের বট না হয় এবং ফেসবুক থেকে রিকোয়েস্ট আসে বা fbclid থাকে, তবেই রিডাইরেক্ট হবে
	if (!isFacebookBot && (referringURL?.includes('facebook.com') || fbclid)) {
		return {
			redirect: {
				permanent: false,
				destination: `https://saveourstateok.org/` + encodeURI(path as string),
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

	let data;

	try {
		data = await graphQLClient.request(query);
	} catch (error) {
		console.error('GraphQL Error:', error);

		return {
			notFound: true,
		};
	}

	if (!data.post) {
		return {
			notFound: true,
		};
	}
	return {
		props: {
			path,
			post: data.post,
			host: ctx.req.headers.host,
		},
	};
};

interface PostProps {
	post: any;
	host: string;
	path: string;
}

const Post: React.FC<PostProps> = (props) => {
	const { post, host, path } = props;

	// to remove tags from excerpt
	const removeTags = (str: string) => {
		if (str === null || str === '') return '';
		else str = str.toString();
		return str.replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '');
	};

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
				
				{/* Featured Image চেক করা হচ্ছে যাতে null error না আসে */}
				{post.featuredImage?.node?.sourceUrl && (
					<>
						<meta property="og:image" content={post.featuredImage.node.sourceUrl} />
						<meta
							property="og:image:alt"
							content={post.featuredImage.node.altText || post.title}
						/>
					</>
				)}
				<title>{post.title}</title>
			</Head>
			<div className="post-container">
				<h1>{post.title}</h1>
				
				{/* Featured Image চেক করে img ট্যাগ রেন্ডার করা হচ্ছে */}
				{post.featuredImage?.node?.sourceUrl && (
					<img
						src={post.featuredImage.node.sourceUrl}
						alt={post.featuredImage.node.altText || post.title}
					/>
				)}
				<article dangerouslySetInnerHTML={{ __html: post.content }} />
			</div>
		</>
	);
};

export default Post;
